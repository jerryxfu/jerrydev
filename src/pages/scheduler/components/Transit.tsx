import React from "react";
import "./Transit.scss";
import {routesConfig} from "../transitConfig.ts";
import {Schedule} from "../../../types/schedule.ts";

const Transit = ({userSchedule}: { userSchedule: Schedule }) => {
    const stl_nextbus_api_json = "https://webservices.umoiq.com/service/publicJSONFeed";

    const activeItineraryId = "iris-58O"; // TODO: fetch from user schedule
    const itineraryConfig = routesConfig.find((route) => route.id === activeItineraryId);


    return userSchedule.id === "iris" && (
        <div className="transit">

        </div>
    );
};

export default Transit;
