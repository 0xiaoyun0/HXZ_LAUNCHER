import {createContext,useContext} from 'react';

export const ContentImages=createContext(true);
export const useContentImages=()=>useContext(ContentImages);
