// src/utils/fileHelpers.js

export const getDisplayName = (filename, userId) => {
    if (!filename) return "";

    // If we know the user ID and the file starts with it, strip it
    if (userId && filename.startsWith(userId + "_")) {
        return filename.replace(userId + "_", "");
    }

    return filename;
};