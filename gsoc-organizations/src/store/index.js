import { configureStore } from "@reduxjs/toolkit"
import { useDispatch, useSelector } from "react-redux"

import { reducer as filtersReducer } from "./filters"
import { reducer as searchReducer } from "./search"
import { reducer as sortReducer } from "./sort"
import bookmarksReducer from "./bookmarks"

const store = configureStore({
  reducer: {
    filters: filtersReducer,
    search: searchReducer,
    sort: sortReducer,
    bookmarks: bookmarksReducer,
  },
})

export const useAppDispatch = () => useDispatch()
export const useAppSelector = useSelector
export default store
