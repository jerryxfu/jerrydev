import {Node} from "./transitConfig.ts";

/***
 * STM Metro Line 2 Stations
 ***/
const stationCartierNode: Node = {id: "STM_M2_CARTIER", name: "Station Cartier", realId: "STATION_M282"};
const stationSauveNode: Node = {id: "STM_M2_SAUVE", name: "Station Sauvé", realId: "STATION_M278"};


export const STM_M2_STATIONS: Record<string, Node> = {
    "cartier": stationCartierNode,
    "sauve": stationSauveNode
};

export const STL_B58O_STOPS: Record<string, Node> = {
    "DE_BLOIS_LEBLANC": {id: "DE_BLOIS_LEBLANC", name: "De Blois / LeBlanc", realId: "41140"},
};

export const STM_B121O_STOPS: Record<string, Node> = {
    "COTE_VERTU_SAINTE_CROIX": {id: "COTE_VERTU_SAINTE_CROIX", name: "Côte-Vertu / Sainte-Croix", realId: "55661"},
};