import React, {useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ExpandMore} from "@mui/icons-material";
import "./CategoryDropdown.scss";

const CategoryDropdown = ({header, persistent, children, className = "", defaultOpen = false,}: {
    header: React.ReactNode;
    persistent: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    defaultOpen?: boolean;
}) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className={`accordion ${className}`}>
            <button
                onClick={() => setOpen(!open)}
                className="accordion-header"
                aria-expanded={open}
                aria-controls="accordion-content"
            >
                <span className="accordion-header-content">{header}</span>
                <ExpandMore className={`accordion-icon ${open ? "open" : ""}`} />
            </button>

            <div className="accordion-persistent">
                {persistent}
            </div>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="accordion-content"
                        id="accordion-content"
                        initial={{height: 0, opacity: 0}}
                        animate={{height: "100%", opacity: 1}}
                        exit={{height: 0, opacity: 0}}
                        transition={{duration: 0.3}}
                        className="accordion-content"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CategoryDropdown;
