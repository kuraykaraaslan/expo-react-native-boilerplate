import { createSlice } from "@reduxjs/toolkit";

import { Auth } from "@/types";

const initialState : { value: Auth } = {
    value: {
        token: "",
        expires: "",
    }
};

export const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setToken: (state, action) => {
            state.value = action.payload;
        },
    },
});

export const {
    setToken,
} = authSlice.actions;
export default authSlice.reducer;