/**
 * Fonctions utilitaires
 */

/**
 * Affiche une notification à l'utilisateur
 * @param {string} message 
 * @param {string} type success|error|warning
 * @param {number} duration 
 */
export function showNotification(message, type = 'success', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, duration);
}

/**
 * Confirme une action avec l'utilisateur
 * @param {string} title 
 * @param {string} message 
 * @returns {Promise<boolean>}
 */
export function confirmAction(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const cancelBtn = document.getElementById('confirm-cancel');
        const okBtn = document.getElementById('confirm-ok');

        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.classList.remove('hidden');

        const cleanUp = () => {
            cancelBtn.removeEventListener('click', onCancel);
            okBtn.removeEventListener('click', onOk);
        };

        const onCancel = () => {
            modal.classList.add('hidden');
            cleanUp();
            resolve(false);
        };

        const onOk = () => {
            modal.classList.add('hidden');
            cleanUp();
            resolve(true);
        };

        cancelBtn.addEventListener('click', onCancel);
        okBtn.addEventListener('click', onOk);
    });
}

/**
 * Formate une taille en octets en format lisible
 * @param {number} bytes 
 * @returns {string}
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Obtient l'icône pour un type de fichier
 * @param {string} type 
 * @returns {string}
 */
export function getFileIcon(type) {
    if (!type) return 'fa-file';

    const typeMap = {
        'application/pdf': 'fa-file-pdf',
        'application/msword': 'fa-file-word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-file-word',
        'application/vnd.ms-excel': 'fa-file-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fa-file-excel',
        'application/vnd.ms-powerpoint': 'fa-file-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'fa-file-powerpoint',
        'text/plain': 'fa-file-alt',
        'text/csv': 'fa-file-csv',
        'image/': 'fa-file-image',
        'video/': 'fa-file-video',
        'audio/': 'fa-file-audio',
        'application/zip': 'fa-file-archive',
        'application/x-rar-compressed': 'fa-file-archive'
    };

    for (const [key, value] of Object.entries(typeMap)) {
        if (type.includes(key)) return value;
    }

    return 'fa-file';
}

/**
 * Crée un élément DOM avec des attributs
 * @param {string} tag 
 * @param {object} attributes 
 * @param {string|HTMLElement} content 
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);

    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }

    if (typeof content === 'string') {
        element.textContent = content;
    } else if (content instanceof HTMLElement) {
        element.appendChild(content);
    }

    return element;
}