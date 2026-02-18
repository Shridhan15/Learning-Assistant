export const getDisplayName = (filename, userId) => {
    if (!filename) return "";

    // If we have a userId, remove it and the following underscore
    if (userId && filename.includes(userId)) {
        return filename.split(userId + "_").pop();
    }

    // Fallback: If it's a long UUID-like string before the name
    if (filename.includes("_")) {
        const parts = filename.split("_");
        if (parts.length > 1) return parts.slice(1).join("_");
    }

    return filename;
};