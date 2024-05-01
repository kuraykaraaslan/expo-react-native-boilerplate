import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    language: 'tr',
};


const globalSlice = createSlice({
    name: 'global',
    initialState,
    reducers: {
        setLanguage: (state, action) => {
            state.language = action.payload;
        }
    },
});

export const { setLanguage } = globalSlice.actions;
export default globalSlice.reducer;