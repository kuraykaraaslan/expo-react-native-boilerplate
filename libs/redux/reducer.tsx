import { combineReducers } from 'redux';

import globalReducer from '@/libs/redux/reducers/globalReducer';
import authReducer from '@/libs/redux/reducers/authReducer';

const rootReducer = combineReducers({
    global: globalReducer,
    auth: authReducer,
});

export default rootReducer;