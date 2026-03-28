
export const fetchFilesAPI = async (token, API_BASE_URL, userId) => {
    const res = await fetch(`${API_BASE_URL}/files/fetch-files`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "user-id": userId,
        },
    });
    if (!res.ok) {
        const errorText = await res.text();
        console.error("Server returned an error page:", errorText);
        throw new Error("Failed to fetch files");
    }
    return res.json();
};

export const deleteBookAPI = async (token, API_BASE_URL, userId, filename) => {
    const res = await fetch(`${API_BASE_URL}/files/delete-book`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "user-id": userId,
        },
        body: JSON.stringify({ filename }),
    });

    if (!res.ok) {
        // Try to get backend error detail
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Delete failed");
    }

    return res.json();
};