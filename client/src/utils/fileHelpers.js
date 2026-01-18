 
export const getDisplayName = (filename, userId) => {
    if (!filename) return "";
 
    if (userId && filename.startsWith(userId + "_")) {
        return filename.replace(userId + "_", "");
    }

    return filename;
};