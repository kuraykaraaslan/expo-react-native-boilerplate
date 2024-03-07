import { createSlice } from "@reduxjs/toolkit";

import { User } from "@/types";

const initialState : { value: User } = {
  value: {
    id: 0,
    name: "",
    email: "",
  }
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.value = action.payload;
    },
  },
});

export const {
  setUser,
} = userSlice.actions;
export default userSlice.reducer;
