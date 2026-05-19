import {useEffect} from "react";

export default function useTitle(title: string) {
    useEffect(() => {
        document.title = title;
        return () => {
            document.title = "jerryxf";
        };
    }, [title]);
}