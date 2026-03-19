import { createSlice } from "@reduxjs/toolkit"


// Helper to load from localStorage
const loadFromStorage = () => {
    if (typeof window !== "undefined") {
        const stored = localStorage.getItem("gsoc_bookmarks")
        return stored ? JSON.parse(stored) : []
    }
    return []
}

const bookmarksSlice = createSlice({
    name: "bookmarks",
    initialState: {
        items: loadFromStorage(),
    },
    reducers: {
        toggleBookmark: (state, action) => {
            const orgName = action.payload
            if (state.items.includes(orgName)) {
                state.items = state.items.filter(name => name !== orgName)
            } else {
                state.items.push(orgName)
            }
            // Save to localStorage
            if (typeof window !== "undefined") {
                localStorage.setItem("gsoc_bookmarks", JSON.stringify(state.items))
            }
        },
        clearBookmarks: state => {
            state.items = []
            if (typeof window !== "undefined") {
                localStorage.removeItem("gsoc_bookmarks")
            }
        },
    },
})

export const { toggleBookmark, clearBookmarks } = bookmarksSlice.actions

export const getBookmarks = state => state.bookmarks.items

export default bookmarksSlice.reducer
