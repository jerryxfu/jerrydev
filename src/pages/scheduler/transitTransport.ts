import {Transport} from "./transitConfig.ts";

/***
 METRO
 ***/
const STM_M2_MONTMORENCY: Transport = {
    type: "metro",
    id: "STM_M2_MONTMORENCY",
    displayName: "Orange Line (2)",
    direction: "Montmorency",
};
const STM_M2_COTE_VERTU: Transport = {
    type: "metro",
    id: "STM_M2_COTE_VERTU",
    displayName: "Orange Line (2)",
    direction: "Côte-Vertu",
};
/***
 STM BUS
 ***/
const STM_B121O: Transport = {
    type: "bus",
    id: "STM_B121O",
    displayName: "121O",
    direction: "Côte-Vertu",
};
/***
 STL BUS
 ***/
const STL_B58O: Transport = {
    type: "bus",
    id: "STL_B58O",
    displayName: "58O",
    direction: "Station Cartier",
};


export const STM_METRO: Record<string, Transport> = {
    "M2_MONTMORENCY": STM_M2_MONTMORENCY,
    "M2_COTE_VERTU": STM_M2_COTE_VERTU,
};

export const STM_BUS: Record<string, Transport> = {
    "121O": STM_B121O,
};

export const STL_BUS: Record<string, Transport> = {
    "58O": STL_B58O,
};
