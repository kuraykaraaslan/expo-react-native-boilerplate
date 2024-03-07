
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slicers/userSlice";
import authReducer from "./slicers/authSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    auth: authReducer,
  },
});

