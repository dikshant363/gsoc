import { createSlice } from "@reduxjs/toolkit"
import {
    getSearchParam,
    removeSearchParam,
    setSearchParams,
} from "../utils/searchParams"
import { urlChanged } from "./actions"

const updateSortInUrl = sort => {
    if (sort && sort !== "name_asc") {
        setSearchParams({
            sort: sort,
        })
    } else {
        removeSearchParam("sort")
    }
}

const sortSlice = createSlice({
    name: "sort",
    initialState: () => {
        return {
            value: getSearchParam("sort") || "name_asc",
        }
    },
    reducers: {
        setSort: (state, action) => {
            state.value = action.payload
            updateSortInUrl(action.payload)
        },
    },
    extraReducers: builder => {
        builder.addCase(urlChanged, (state, action) => {
            const { sort } = action.payload
            return {
                value: sort || "name_asc",
            }
        })
    },
})

export const getSort = state => {
    return state.sort.value
}

export const {
    reducer,
    actions: { setSort },
} = sortSlice
