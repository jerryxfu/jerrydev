// The licence's icons are lazy, as pictures from other sites are: mirrors.creativecommons.org is slow or fails at
// times, and an eager picture holds back the page's load event (why that matters: HomePage/useReveals.ts).
export default function Copyright() {
    return (
        <div>
            <a href="https://creativecommons.org">jerryxf.net</a> © 2022 by <a href="https://creativecommons.org">Jerry F.</a> is licensed
            under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a><img
            src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" loading="lazy"
            style={{maxWidth: "1em", maxHeight: "1em", marginLeft: "0.2em"}} /><img
            src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" loading="lazy"
            style={{maxWidth: "1em", maxHeight: "1em", marginLeft: "0.2em"}} /><img
            src="https://mirrors.creativecommons.org/presskit/icons/nc.svg" alt="" loading="lazy"
            style={{maxWidth: "1em", maxHeight: "1em", marginLeft: "0.2em"}} /><img
            src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="" loading="lazy"
            style={{maxWidth: "1em", maxHeight: "1em", marginLeft: "0.2em"}} />
        </div>
    );
};
