/**
 * Gestion du stockage local avec IndexedDB
 */
class SafeStorage {
    constructor() {
        this.dbName = 'SafeStudentDB';
        this.dbVersion = 2;
        this.db = null;
    }

    /**
     * Initialise la base de données
     * @returns {Promise<void>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Crée le store pour les documents
                if (!db.objectStoreNames.contains('documents')) {
                    const store = db.createObjectStore('documents', { keyPath: 'id' });
                    store.createIndex('subject', 'subject', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Crée le store pour la configuration
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                reject(new Error('Erreur lors de l\'ouverture de la base de données'));
            };
        });
    }

    /**
     * Sauvegarde un document
     * @param {object} docData 
     * @returns {Promise<string>} ID du document
     */
    async saveDocument(docData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['documents'], 'readwrite');
            const store = transaction.objectStore('documents');

            const request = store.put(docData);

            request.onsuccess = () => resolve(docData.id);
            request.onerror = () => reject(new Error('Erreur lors de la sauvegarde du document'));
        });
    }

    /**
     * Récupère un document par son ID
     * @param {string} id 
     * @returns {Promise<object|null>}
     */
    async getDocument(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['documents'], 'readonly');
            const store = transaction.objectStore('documents');

            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(new Error('Erreur lors de la récupération du document'));
        });
    }

    /**
     * Liste tous les documents
     * @param {string} subject 
     * @returns {Promise<Array>}
     */
    async listDocuments(subject = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['documents'], 'readonly');
            const store = transaction.objectStore('documents');

            let request;
            if (subject) {
                const index = store.index('subject');
                request = index.getAll(subject);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Erreur lors de la liste des documents'));
        });
    }

    /**
     * Supprime un document
     * @param {string} id 
     * @returns {Promise<void>}
     */
    async deleteDocument(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['documents'], 'readwrite');
            const store = transaction.objectStore('documents');

            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Erreur lors de la suppression du document'));
        });
    }

    /**
     * Sauvegarde une configuration
     * @param {string} key 
     * @param {any} value 
     * @returns {Promise<void>}
     */
    async saveConfig(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['config'], 'readwrite');
            const store = transaction.objectStore('config');

            const request = store.put({ key, value });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Erreur lors de la sauvegarde de la configuration'));
        });
    }

    /**
     * Récupère une configuration
     * @param {string} key 
     * @returns {Promise<any>}
     */
    async getConfig(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['config'], 'readonly');
            const store = transaction.objectStore('config');

            const request = store.get(key);

            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(new Error('Erreur lors de la récupération de la configuration'));
        });
    }
}

const storage = new SafeStorage();
export default storage;