import crypto from './crypto.js';
import storage from './storage.js';

/**
 * Gestion des documents avec chiffrement/déchiffrement
 */
class DocumentManager {
    constructor() {
        this.masterKey = null;
        this.masterSalt = null;
    }

    /**
     * Initialise avec la clé maître
     * @param {CryptoKey} masterKey 
     * @param {Uint8Array} masterSalt 
     */
    init(masterKey, masterSalt) {
        this.masterKey = masterKey;
        this.masterSalt = masterSalt;
    }

    /**
     * Upload et chiffre un document
     * @param {File} file 
     * @param {string} name 
     * @param {string} subject 
     * @returns {Promise<string>} ID du document
     */
    async uploadDocument(file, name, subject) {
        if (!this.masterKey) throw new Error('Master key not initialized');

        // Génère un ID unique
        const docId = crypto.arrayBufferToBase64(crypto.generateSalt());

        // Lit le fichier comme ArrayBuffer
        const fileData = await this.readFileAsArrayBuffer(file);

        // Chiffre le contenu du fichier
        const iv = crypto.generateIV();
        const { encrypted: encryptedData } = await crypto.encryptData(fileData, this.masterKey, iv);

        // Chiffre le nom et la matière
        const nameEncryption = await crypto.encryptText(name, this.masterKey);
        const subjectEncryption = await crypto.encryptText(subject, this.masterKey);
        // Prépare les métadonnées
        const docData = {
            id: docId,
            name: nameEncryption.encrypted,
            subject: subjectEncryption.encrypted,
            encryptedBlob: new Blob([encryptedData], { type: 'application/octet-stream' }),
            metadata: {
                size: file.size,
                type: file.type,
                originalName: file.name,
                createdAt: new Date().toISOString()
            },
            crypto: {
                iv: Array.from(iv),
                nameIV: Array.from(nameEncryption.iv),
                subjectIV: Array.from(subjectEncryption.iv)
            }
        };

        // Sauvegarde en base de données
        await storage.saveDocument(docData);
        return docId;
    }

    /**
     * Télécharge et déchiffre un document
     * @param {string} docId 
     * @returns {Promise<{name: string, blob: Blob}>}
     */
    async downloadDocument(docId) {
        if (!this.masterKey) throw new Error('Master key not initialized');

        // Récupère le document depuis la base
        const docData = await storage.getDocument(docId);
        if (!docData) throw new Error('Document not found');

        // Lit le blob chiffré
        const encryptedBlob = await this.readBlobAsArrayBuffer(docData.encryptedBlob);

        // Convertit les IV en Uint8Array
        const iv = new Uint8Array(docData.crypto.iv);
        const nameIV = new Uint8Array(docData.crypto.nameIV);
        const subjectIV = new Uint8Array(docData.crypto.subjectIV);

        // Déchiffre le contenu
        const decryptedData = await crypto.decryptData(encryptedBlob, this.masterKey, iv);

        // Déchiffre le nom et la matière
        const name = await crypto.decryptText(docData.name, this.masterKey, nameIV);
        const subject = await crypto.decryptText(docData.subject, this.masterKey, subjectIV);

        // Crée un blob déchiffré
        const blob = new Blob([decryptedData], { type: docData.metadata.type });

        return {
            name: name || docData.metadata.originalName,
            subject,
            blob,
            metadata: docData.metadata
        };
    }

    /**
     * Liste les documents (métadonnées seulement)
     * @param {string} subject 
     * @returns {Promise<Array>}
     */
    async listDocuments(subject = null) {
        if (!this.masterKey) throw new Error('Master key not initialized');

        const encryptedDocs = await storage.listDocuments(subject);
        const docs = [];

        for (const doc of encryptedDocs) {
            try {
                const nameIV = new Uint8Array(doc.crypto.nameIV);
                const subjectIV = new Uint8Array(doc.crypto.subjectIV);

                const name = await crypto.decryptText(doc.name, this.masterKey, nameIV);
                const subject = await crypto.decryptText(doc.subject, this.masterKey, subjectIV);

                docs.push({
                    id: doc.id,
                    name,
                    subject,
                    metadata: doc.metadata
                });
            } catch (error) {
                console.error('Error decrypting document metadata:', error);
            }
        }

        return docs;
    }

    /**
     * Supprime un document
     * @param {string} docId 
     * @returns {Promise<void>}
     */
    async deleteDocument(docId) {
        return storage.deleteDocument(docId);
    }

    /**
     * Lit un fichier comme ArrayBuffer
     * @param {File} file 
     * @returns {Promise<ArrayBuffer>}
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Lit un Blob comme ArrayBuffer
     * @param {Blob} blob 
     * @returns {Promise<ArrayBuffer>}
     */
    readBlobAsArrayBuffer(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }
}

const documentManager = new DocumentManager();
export default documentManager;