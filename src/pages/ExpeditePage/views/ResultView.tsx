import React from "react";
import {Check, Clipboard, Download, File, FileText, Link, Trash2} from "lucide-react";
import {DropMeta} from "../types.ts";
import {formatBytes, getDropUrl, timeUntil} from "../utils.ts";
import "./ResultView.scss";

interface ResultViewProps {
    result: DropMeta;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    onDownload: () => void;
    onDelete: () => void;
}

export default function ResultView({result, copiedField, onCopy, onDownload, onDelete}: ResultViewProps) {
    return (
        <div className="expedite_retrieved">
            {/* Metadata card */}
            <div className="expedite_meta">
                <div className="expedite_meta-header">
                    <span className="expedite_meta-type">
                        {result.type === "text" ? <FileText size={14} /> : <File size={14} />}
                        {result.type}
                    </span>
                    <span className="expedite_meta-code">{result.code}</span>
                </div>
                <div className="expedite_meta-grid">
                    {result.fileName && (
                        <div className="expedite_meta-item">
                            <span className="expedite_meta-label">Filename</span>
                            <span className="expedite_meta-value">{result.fileName}</span>
                        </div>
                    )}
                    <div className="expedite_meta-item">
                        <span className="expedite_meta-label">Size</span>
                        <span className="expedite_meta-value">{formatBytes(result.size)}</span>
                    </div>
                    {result.mimeType && (
                        <div className="expedite_meta-item">
                            <span className="expedite_meta-label">MIME type</span>
                            <span className="expedite_meta-value">{result.mimeType}</span>
                        </div>
                    )}
                    {result.encoding && (
                        <div className="expedite_meta-item">
                            <span className="expedite_meta-label">Encoding</span>
                            <span className="expedite_meta-value">{result.encoding}</span>
                        </div>
                    )}
                    <div className="expedite_meta-item">
                        <span className="expedite_meta-label">Created</span>
                        <span className="expedite_meta-value">{new Date(result.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="expedite_meta-item">
                        <span className="expedite_meta-label">Expires in</span>
                        <span className="expedite_meta-value">{timeUntil(result.expiresAt)}</span>
                    </div>
                    <div className="expedite_meta-item">
                        <span className="expedite_meta-label">Views</span>
                        <span className="expedite_meta-value">
                            {result.views}{result.maxViews ? ` / ${result.maxViews}` : ""}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            {result.type === "text" && result.text && (
                <>
                    <p className="expedite_content-label">Content</p>
                    <div className="expedite_text-preview">
                        <pre>{result.text}</pre>
                    </div>
                </>
            )}

            {/* Actions */}
            <div className="expedite_btn-row">
                <button
                    className={`expedite_btn-icon ${result.deletable ? "expedite_btn-icon--danger" : "expedite_btn-icon--disabled"}`}
                    onClick={onDelete}
                    disabled={!result.deletable}
                    title={result.deletable ? "Delete drop" : "Deletion disabled by sender"}
                >
                    <Trash2 size={16} />
                </button>
                <button
                    className="expedite_btn-secondary"
                    onClick={(e) => onCopy(result.code, "code", e)}
                >
                    {copiedField === "code" ? <Check size={14} /> : <Clipboard size={14} />}
                    {copiedField === "code" ? "Copied" : "Code"}
                </button>
                <button
                    className="expedite_btn-secondary"
                    onClick={(e) => onCopy(getDropUrl(result.code), "link", e)}
                >
                    {copiedField === "link" ? <Check size={14} /> : <Link size={14} />}
                    {copiedField === "link" ? "Copied" : "Link"}
                </button>
                {result.type === "text" && result.text && (
                    <button
                        className="expedite_btn-secondary"
                        onClick={(e) => onCopy(result.text!, "text", e)}
                    >
                        {copiedField === "text" ? <Check size={14} /> : <Clipboard size={14} />}
                        {copiedField === "text" ? "Copied" : "Text"}
                    </button>
                )}
                <button className="expedite_btn-primary" onClick={onDownload}>
                    <Download size={14} />
                    Download
                </button>
            </div>
        </div>
    );
}