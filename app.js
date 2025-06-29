import crypto from './modules/crypto.js';
import storage from './modules/storage.js';
import documentManager from './modules/documents.js';
import { showNotification, confirmAction, formatFileSize, getFileIcon, createElement } from './modules/utils.js';

class SafeStudentApp {
    constructor() {
        this.currentSubject = 'all';
        this.currentSort = 'date-desc';
        this.selectedFiles = [];

        this.init();
    }

    async init() {
        try {
            // Initialise la base de données
            await storage.init();

            // Configure les écouteurs d'événements
            this.setupEventListeners();
            this.setupAuthSwitch();

            // Affiche la vue appropriée
            const hasPassword = await storage.getConfig('masterPasswordHash');
            if (hasPassword) {
                this.showAuthView();
            } else {
                this.showSignupView();
            }
        } catch (error) {
            console.error('Initialization error:', error);
            showNotification('Erreur d\'initialisation de l\'application', 'error');
        }
    }

    showAuthView() {
        document.getElementById('auth-view').classList.remove('hidden');
        document.getElementById('signup-view').classList.add('hidden');
        document.getElementById('main-view').classList.add('hidden');
        document.getElementById('password').focus();
    }

    showSignupView() {
        document.getElementById('auth-view').classList.add('hidden');
        document.getElementById('signup-view').classList.remove('hidden');
        document.getElementById('main-view').classList.add('hidden');
        document.getElementById('new-password').focus();
    }

    showMainView() {
        document.getElementById('auth-view').classList.add('hidden');
        document.getElementById('signup-view').classList.add('hidden');
        document.getElementById('main-view').classList.remove('hidden');
        this.loadDocuments();
    }

    setupEventListeners() {
        // Authentification
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

        // Navigation
        document.querySelectorAll('.subject-list li').forEach(item => {
            item.addEventListener('click', () => this.handleSubjectChange(item));
        });

        // Documents
        document.getElementById('add-doc-btn').addEventListener('click', () => this.showUploadArea());
        document.getElementById('cancel-upload-btn').addEventListener('click', () => this.hideUploadArea());
        document.getElementById('upload-btn').addEventListener('click', () => this.uploadDocuments());
        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.loadDocuments();
        });

        // Drag and drop
        const dropZone = document.getElementById('drop-zone');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('active');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('active');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('active');
            this.handleFileDrop(e.dataTransfer.files);
        });

        document.getElementById('browse-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });
    }

    setupAuthSwitch() {
        // Switch between login and signup
        document.getElementById('switch-to-signup').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignupView();
        });

        document.getElementById('switch-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthView();
        });

        // Password strength indicator
        document.getElementById('new-password').addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
        });
    }

    updatePasswordStrength(password) {
        const strengthIndicator = document.getElementById('password-strength');
        if (!strengthIndicator) return;

        let strength = 0;
        let strengthText = '';
        let strengthClass = '';

        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        switch (strength) {
            case 0:
            case 1:
                strengthText = 'Faible';
                strengthClass = 'weak';
                break;
            case 2:
            case 3:
                strengthText = 'Moyen';
                strengthClass = 'medium';
                break;
            case 4:
            case 5:
                strengthText = 'Fort';
                strengthClass = 'strong';
                break;
        }

        strengthIndicator.textContent = strengthText;
        strengthIndicator.className = `strength-indicator ${strengthClass}`;
    }

    async handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('password').value;

        try {
            // Récupère le sel et le hash du mot de passe
            const masterSalt = await storage.getConfig('masterSalt');
            const masterPasswordHash = await storage.getConfig('masterPasswordHash');

            if (!masterSalt || !masterPasswordHash) {
                throw new Error('Configuration manquante');
            }

            // Convertit le sel de base64 en Uint8Array
            const saltArray = Uint8Array.from(atob(masterSalt), c => c.charCodeAt(0));

            // Vérifie le mot de passe
            const passwordHash = await crypto.hashPassword(password, saltArray);
            if (passwordHash !== masterPasswordHash) {
                throw new Error('Mot de passe incorrect');
            }

            // Dérive la clé maître
            const masterKey = await crypto.deriveMasterKey(password, saltArray);
            documentManager.init(masterKey, saltArray);

            // Affiche la vue principale
            this.showMainView();
            showNotification('Connexion réussie', 'success');
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Mot de passe incorrect', 'error');
            document.getElementById('password').value = '';
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            showNotification('Les mots de passe ne correspondent pas', 'error');
            return;
        }

        if (newPassword.length < 8) {
            showNotification('Le mot de passe doit faire au moins 8 caractères', 'error');
            return;
        }

        try {
            // Vérifie si un compte existe déjà
            const existingHash = await storage.getConfig('masterPasswordHash');
            if (existingHash) {
                const overwrite = await confirmAction(
                    'Compte existant',
                    'Un compte existe déjà. Voulez-vous le remplacer ? Toutes les données chiffrées existantes deviendront illisibles.'
                );

                if (!overwrite) return;
            }

            // Génère un sel aléatoire
            const masterSalt = crypto.generateSalt();
            const masterSaltBase64 = btoa(String.fromCharCode(...masterSalt));

            // Dérive la clé maître
            const masterKey = await crypto.deriveMasterKey(newPassword, masterSalt);

            // Stocke le hash du mot de passe et le sel
            const masterPasswordHash = await crypto.hashPassword(newPassword, masterSalt);
            await storage.saveConfig('masterPasswordHash', masterPasswordHash);
            await storage.saveConfig('masterSalt', masterSaltBase64);

            // Initialise le gestionnaire de documents
            documentManager.init(masterKey, masterSalt);

            // Affiche la vue principale
            this.showMainView();
            showNotification('Compte créé avec succès', 'success');
        } catch (error) {
            console.error('Signup error:', error);
            showNotification('Erreur lors de la création du compte', 'error');
        }
    }

    handleLogout() {
        // Réinitialise l'état
        documentManager.init(null, null);
        this.selectedFiles = [];

        // Nettoie l'interface
        document.getElementById('password').value = '';
        document.getElementById('documents-grid').innerHTML = '';

        // Affiche la vue d'authentification
        this.showAuthView();
        showNotification('Déconnexion réussie', 'success');
    }

    showUploadArea() {
        document.getElementById('upload-area').classList.remove('hidden');
        document.getElementById('documents-list').classList.add('hidden');
        document.getElementById('doc-name').value = '';
        document.getElementById('file-input').value = '';
        this.selectedFiles = [];
        document.getElementById('upload-btn').disabled = true;
    }

    hideUploadArea() {
        document.getElementById('upload-area').classList.add('hidden');
        document.getElementById('documents-list').classList.remove('hidden');
    }

    handleSubjectChange(item) {
        document.querySelectorAll('.subject-list li').forEach(li => li.classList.remove('active'));
        item.classList.add('active');

        this.currentSubject = item.dataset.subject;
        document.getElementById('current-subject').textContent =
            item.textContent.trim();

        this.loadDocuments();
    }

    handleFileDrop(files) {
        this.handleFileSelection(files);
    }

    handleFileSelection(files) {
        if (!files || files.length === 0) return;

        this.selectedFiles = Array.from(files);
        document.getElementById('upload-btn').disabled = false;

        // Définit un nom par défaut si un seul fichier
        if (this.selectedFiles.length === 1) {
            const file = this.selectedFiles[0];
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
            document.getElementById('doc-name').value = nameWithoutExt;
        }

        showNotification(`${this.selectedFiles.length} fichier(s) sélectionné(s)`, 'success');
    }

    async uploadDocuments() {
        const subject = document.getElementById('doc-subject').value;
        let name = document.getElementById('doc-name').value.trim();

        if (!name) {
            showNotification('Veuillez donner un nom au document', 'error');
            return;
        }

        try {
            for (const file of this.selectedFiles) {
                const fileName = this.selectedFiles.length > 1 ?
                    `${name} - ${file.name}` : name;

                await documentManager.uploadDocument(file, fileName, subject);
            }

            showNotification('Document(s) sauvegardé(s) avec succès', 'success');
            this.hideUploadArea();
            this.loadDocuments();
        } catch (error) {
            console.error('Upload error:', error);
            showNotification('Erreur lors de la sauvegarde du document', 'error');
        }
    }

    async loadDocuments() {
        try {
            const docsGrid = document.getElementById('documents-grid');
            docsGrid.innerHTML = '<div class="loading">Chargement...</div>';

            let docs = await documentManager.listDocuments(
                this.currentSubject === 'all' ? null : this.currentSubject
            );

            // Trie les documents
            docs = this.sortDocuments(docs, this.currentSort);

            // Affiche les documents
            docsGrid.innerHTML = '';

            if (docs.length === 0) {
                docsGrid.innerHTML = '<div class="empty">Aucun document trouvé</div>';
                return;
            }

            for (const doc of docs) {
                const docCard = this.createDocumentCard(doc);
                docsGrid.appendChild(docCard);
            }
        } catch (error) {
            console.error('Load documents error:', error);
            showNotification('Erreur lors du chargement des documents', 'error');
        }
    }

    sortDocuments(docs, sortOption) {
        switch (sortOption) {
            case 'date-asc':
                return [...docs].sort((a, b) =>
                    new Date(a.metadata.createdAt) - new Date(b.metadata.createdAt));
            case 'name-asc':
                return [...docs].sort((a, b) =>
                    a.name.localeCompare(b.name));
            case 'name-desc':
                return [...docs].sort((a, b) =>
                    b.name.localeCompare(a.name));
            case 'date-desc':
            default:
                return [...docs].sort((a, b) =>
                    new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt));
        }
    }

    createDocumentCard(doc) {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.dataset.id = doc.id;

        // Icône du fichier
        const icon = document.createElement('i');
        icon.className = `fas ${getFileIcon(doc.metadata.type)}`;

        const thumbnail = document.createElement('div');
        thumbnail.className = 'document-thumbnail';
        thumbnail.appendChild(icon);

        // Info du document
        const info = document.createElement('div');
        info.className = 'document-info';

        const name = document.createElement('div');
        name.className = 'document-name';
        name.textContent = doc.name;

        const meta = document.createElement('div');
        meta.className = 'document-meta';

        const size = document.createElement('span');
        size.textContent = formatFileSize(doc.metadata.size);

        const date = document.createElement('span');
        date.textContent = new Date(doc.metadata.createdAt).toLocaleDateString();

        meta.appendChild(size);
        meta.appendChild(date);

        info.appendChild(name);
        info.appendChild(meta);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'document-actions';

        const downloadBtn = document.createElement('button');
        downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
        downloadBtn.title = 'Télécharger';
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.downloadDocument(doc.id);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Supprimer';
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const confirmed = await confirmAction(
                'Supprimer le document',
                `Êtes-vous sûr de vouloir supprimer "${doc.name}" ? Cette action est irréversible.`
            );

            if (confirmed) {
                try {
                    await documentManager.deleteDocument(doc.id);
                    showNotification('Document supprimé', 'success');
                    this.loadDocuments();
                } catch (error) {
                    console.error('Delete error:', error);
                    showNotification('Erreur lors de la suppression', 'error');
                }
            }
        });

        actions.appendChild(downloadBtn);
        actions.appendChild(deleteBtn);

        // Assemblage de la carte
        card.appendChild(thumbnail);
        card.appendChild(info);
        card.appendChild(actions);

        // Gestion du clic sur la carte
        card.addEventListener('click', () => {
            this.downloadDocument(doc.id);
        });

        return card;
    }

    async downloadDocument(docId) {
        try {
            showNotification('Préparation du téléchargement...', 'success');

            const { name, blob } = await documentManager.downloadDocument(docId);

            // Crée un lien de téléchargement
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();

            // Nettoie
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            showNotification('Téléchargement terminé', 'success');
        } catch (error) {
            console.error('Download error:', error);
            showNotification('Erreur lors du téléchargement', 'error');
        }
    }
}

// Lance l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    new SafeStudentApp();
});