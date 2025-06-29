/**
 * Module de chiffrement sécurisé utilisant Web Crypto API
 * Implémente AES-GCM avec PBKDF2 pour la dérivation de clé
 */
class SafeCrypto {
    constructor() {
        this.PBKDF2_ITERATIONS = 100000;
        this.SALT_LENGTH = 32;
        this.IV_LENGTH = 12;
    }

    /**
     * Génère un sel aléatoire
     * @returns {Uint8Array}
     */
    generateSalt() {
        return window.crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    }

    /**
     * Génère un vecteur d'initialisation (IV)
     * @returns {Uint8Array}
     */
    generateIV() {
        return window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    }

    /**
     * Dérive une clé maître à partir d'un mot de passe
     * @param {string} password 
     * @param {Uint8Array} salt 
     * @returns {Promise<CryptoKey>}
     */
    async deriveMasterKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Chiffre des données avec AES-GCM
     * @param {ArrayBuffer} data 
     * @param {CryptoKey} key 
     * @param {Uint8Array} iv 
     * @returns {Promise<{encrypted: ArrayBuffer, iv: Uint8Array}>}
     */
    async encryptData(data, key, iv) {
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            data
        );

        return { encrypted, iv };
    }

    /**
     * Déchiffre des données avec AES-GCM
     * @param {ArrayBuffer} encryptedData 
     * @param {CryptoKey} key 
     * @param {Uint8Array} iv 
     * @returns {Promise<ArrayBuffer>}
     */
    async decryptData(encryptedData, key, iv) {
        try {
            return await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encryptedData
            );
        } catch (error) {
            console.error('Erreur de déchiffrement:', error);
            throw new Error('Échec du déchiffrement - mot de passe incorrect ou données corrompues');
        }
    }

    /**
     * Chiffre une chaîne de caractères
     * @param {string} text 
     * @param {CryptoKey} key 
     * @returns {Promise<{encrypted: ArrayBuffer, iv: Uint8Array}>}
     */
    async encryptText(text, key) {
        const encoder = new TextEncoder();
        const iv = this.generateIV();
        const data = encoder.encode(text);
        const encrypted = await this.encryptData(data, key, iv);
        return { encrypted: encrypted.encrypted, iv };
    }

    /**
     * Déchiffre une chaîne de caractères
     * @param {ArrayBuffer} encryptedText 
     * @param {CryptoKey} key 
     * @param {Uint8Array} iv 
     * @returns {Promise<string>}
     */
    async decryptText(encryptedText, key, iv) {
        const decrypted = await this.decryptData(encryptedText, key, iv);
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }

    /**
     * Génère un hash pour le mot de passe (pour vérification)
     * @param {string} password 
     * @param {Uint8Array} salt 
     * @returns {Promise<string>}
     */
    async hashPassword(password, salt) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt.toString());
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        return this.arrayBufferToBase64(hashBuffer);
    }

    /**
     * Convertit un ArrayBuffer en base64
     * @param {ArrayBuffer} buffer 
     * @returns {string}
     */
    arrayBufferToBase64(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }
}

const crypto = new SafeCrypto();
export default crypto;