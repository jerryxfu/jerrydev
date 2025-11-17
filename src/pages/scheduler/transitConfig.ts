import {STL_B58O_STOPS, STM_B121O_STOPS, STM_M2_STATIONS} from "./transitNodes.ts";
import {STL_BUS, STM_BUS, STM_METRO} from "./transitTransport.ts";

export interface Node {
    id: string; // e.g. internal node ID
    name: string;  // e.g. display name
    realId?: string; // e.g. stop ID
}

export interface Transport {
    type: "walk" | "bus" | "metro" | "train" | "REM" | string;
    id: string;
    displayName: string;
    agency?: "STM" | "STL" | string;
    direction?: string;
    iconUrl?: string;
}

export interface Segment {
    id: string;
    name: string;
    startNode: Node;
    endNode: Node;
    transport: Transport | "walk";
    minimumDurationMins?: number;
    crowdLevel?: "low" | "medium" | "high";
    preferredExitLocations?: ("front" | "front-middle" | "middle" | "middle-rear" | "rear" | string)[];
    stopCount?: number; // number of stops exclusively between start and end nodes
    note?: string;
}

export interface TransitConfig {
    id: string;
    name: string;
    segments: Segment[];
    arriveTime?: string; // "HH:MM"
    departTime?: string; // "HH:MM"
}

const departureNode: Node = {id: "DEPARTURE", name: "Departure"};
const destinationNode: Node = {id: "DESTINATION", name: "Destination"};

export const routesConfig: TransitConfig[] = [
    {
        id: "iris-58O",
        name: "Iris 58O Morning",
        segments: [
            {
                id: "DEPARTURE-STL58O",
                name: "Walk to STL 58O stop",
                startNode: departureNode,
                endNode: STL_B58O_STOPS["41140"]!,
                transport: "walk",
                minimumDurationMins: 6,
            },
            {
                id: "STL58O-STATION_M282",
                name: "Take the 58O to Station Cartier",
                startNode: STL_B58O_STOPS["41140"]!,
                endNode: STM_M2_STATIONS["cartier"]!,
                transport: STL_BUS["58O"]!
            },
            {
                id: "STATION_M282-STATION_M278",
                name: "Take the metro to Station Sauvé",
                startNode: STM_M2_STATIONS["cartier"]!,
                endNode: STM_M2_STATIONS["sauve"]!,
                transport: STM_METRO["M2_COTE_VERTU"]!,
                preferredExitLocations: ["front-middle", "rear-middle"],
                stopCount: 1
            },
            {
                id: "STATION_M278-STM121E",
                name: "Take the 121E to destination",
                startNode: STM_M2_STATIONS["sauve"]!,
                endNode: STM_B121O_STOPS["COTE_VERTU_SAINTE_CROIX"]!,
                transport: STM_BUS["121O"]!,
            },
            {
                id: "STM121E-DESTINATION",
                name: "Walk to destination",
                startNode: STM_B121O_STOPS["COTE_VERTU_SAINTE_CROIX"]!,
                endNode: destinationNode,
                transport: "walk",
                minimumDurationMins: 5,
            }
        ]
    }
];