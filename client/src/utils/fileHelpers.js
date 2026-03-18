export const getDisplayName = (input, userId) => {
    // handle both string & object
    const filename =
        typeof input === "string"
            ? input
            : input?.filename;

    if (!filename || typeof filename !== "string") {
        return "Unknown File";
    }

    // Remove userId prefix
    if (userId && filename.includes(userId)) {
        return filename.split(userId + "_").pop();
    }

    // Fallback (remove prefix before first underscore)
    if (filename.includes("_")) {
        const parts = filename.split("_");
        if (parts.length > 1) return parts.slice(1).join("_");
    }

    return filename;
};