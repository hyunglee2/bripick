"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import {
    createProfilePhotoDataUrl,
    createProfilePhotoSourceDataUrl,
    ProfilePhotoCrop,
} from "@/lib/profilePhoto";

type Point = { x: number; y: number };

interface ProfilePhotoCropDialogProps {
    file?: File | null;
    source?: string;
    initialCrop?: ProfilePhotoCrop;
    onApply: (result: { photo: string; source: string; crop: ProfilePhotoCrop }) => void;
    onCancel: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function ProfilePhotoCropDialog(props: ProfilePhotoCropDialogProps) {
    if ((!props.file && !props.source) || typeof document === "undefined") return null;

    const editorKey = props.file
        ? `${props.file.name}-${props.file.size}-${props.file.lastModified}`
        : `existing-${props.source?.length ?? 0}`;
    return <ProfilePhotoCropEditor key={editorKey} {...props} />;
}

function ProfilePhotoCropEditor({
    file,
    source: existingSource,
    initialCrop = { focusX: 0.5, focusY: 0.5, zoom: 1 },
    onApply,
    onCancel,
}: ProfilePhotoCropDialogProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ pointerId: number; start: Point; origin: Point } | null>(null);
    const [source, setSource] = useState(existingSource ?? "");
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [zoom, setZoom] = useState(initialCrop.zoom);
    const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!file) return;
        const reader = new FileReader();
        let cancelled = false;

        reader.onload = () => {
            if (!cancelled) setSource(String(reader.result));
        };
        reader.readAsDataURL(file);

        return () => {
            cancelled = true;
            if (reader.readyState === FileReader.LOADING) reader.abort();
        };
    }, [file]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onCancel();
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onCancel]);

    const getMetrics = useCallback((nextZoom = zoom) => {
        if (!viewportSize.width || !viewportSize.height || !imageSize.width || !imageSize.height) return null;
        const viewportWidth = viewportSize.width;
        const viewportHeight = viewportSize.height;
        const baseScale = Math.max(viewportWidth / imageSize.width, viewportHeight / imageSize.height);
        const renderedWidth = imageSize.width * baseScale * nextZoom;
        const renderedHeight = imageSize.height * baseScale * nextZoom;
        return {
            viewportWidth,
            viewportHeight,
            renderedWidth,
            renderedHeight,
            maxX: Math.max(0, (renderedWidth - viewportWidth) / 2),
            maxY: Math.max(0, (renderedHeight - viewportHeight) / 2),
        };
    }, [imageSize, viewportSize, zoom]);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const resizeObserver = new ResizeObserver(([entry]) => {
            setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height });
        });
        resizeObserver.observe(viewport);
        return () => resizeObserver.disconnect();
    }, []);

    const clampOffset = useCallback((point: Point, nextZoom = zoom) => {
        const metrics = getMetrics(nextZoom);
        if (!metrics) return point;
        return {
            x: clamp(point.x, -metrics.maxX, metrics.maxX),
            y: clamp(point.y, -metrics.maxY, metrics.maxY),
        };
    }, [getMetrics, zoom]);

    const updateZoom = (nextZoom: number) => {
        const normalizedZoom = clamp(nextZoom, 1, 3);
        setZoom(normalizedZoom);
        setOffset((current) => clampOffset(current, normalizedZoom));
    };

    const handleApply = async () => {
        if ((!file && !existingSource) || isSaving) return;
        const metrics = getMetrics();
        if (!metrics) return;
        const imageLeft = (metrics.viewportWidth - metrics.renderedWidth) / 2 + offset.x;
        const imageTop = (metrics.viewportHeight - metrics.renderedHeight) / 2 + offset.y;
        const focusX = (metrics.viewportWidth / 2 - imageLeft) / metrics.renderedWidth;
        const focusY = (metrics.viewportHeight / 2 - imageTop) / metrics.renderedHeight;

        setIsSaving(true);
        try {
            const crop = { focusX, focusY, zoom };
            const storedSource = file
                ? await createProfilePhotoSourceDataUrl(file)
                : String(existingSource);
            const photo = await createProfilePhotoDataUrl(storedSource, crop);
            onApply({ photo, source: storedSource, crop });
        } finally {
            setIsSaving(false);
        }
    };

    const metrics = getMetrics();
    const imageStyle = metrics ? {
        width: `${metrics.renderedWidth}px`,
        height: `${metrics.renderedHeight}px`,
        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
    } : undefined;

    return createPortal(
        <div className="profile-crop-backdrop" role="presentation" onPointerDown={(event) => {
            if (event.target === event.currentTarget) onCancel();
        }}>
            <section className="profile-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-crop-title">
                <header className="profile-crop-header">
                    <div>
                        <h2 id="profile-crop-title">프로필 사진 맞추기</h2>
                        <p>사진을 움직여 영역 안에 맞춰주세요.</p>
                    </div>
                    <button type="button" className="profile-crop-icon-button" onClick={onCancel} aria-label="사진 편집 닫기">
                        <X size={20} />
                    </button>
                </header>

                <div
                    ref={viewportRef}
                    className="profile-crop-viewport"
                    onPointerDown={(event) => {
                        if (!metrics) return;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        dragRef.current = {
                            pointerId: event.pointerId,
                            start: { x: event.clientX, y: event.clientY },
                            origin: offset,
                        };
                    }}
                    onPointerMove={(event) => {
                        const drag = dragRef.current;
                        if (!drag || drag.pointerId !== event.pointerId) return;
                        setOffset(clampOffset({
                            x: drag.origin.x + event.clientX - drag.start.x,
                            y: drag.origin.y + event.clientY - drag.start.y,
                        }));
                    }}
                    onPointerUp={(event) => {
                        if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
                    }}
                    onPointerCancel={() => { dragRef.current = null; }}
                >
                    {source && (
                        <img
                            src={source}
                            alt="자르기 전 프로필 사진"
                            draggable={false}
                            style={imageStyle}
                            onLoad={(event) => {
                                const viewport = viewportRef.current?.getBoundingClientRect();
                                const naturalWidth = event.currentTarget.naturalWidth;
                                const naturalHeight = event.currentTarget.naturalHeight;
                                setImageSize({
                                    width: naturalWidth,
                                    height: naturalHeight,
                                });
                                if (viewport) {
                                    setViewportSize({ width: viewport.width, height: viewport.height });
                                    const baseScale = Math.max(viewport.width / naturalWidth, viewport.height / naturalHeight);
                                    const renderedWidth = naturalWidth * baseScale * initialCrop.zoom;
                                    const renderedHeight = naturalHeight * baseScale * initialCrop.zoom;
                                    setOffset({
                                        x: clamp((0.5 - initialCrop.focusX) * renderedWidth, -(renderedWidth - viewport.width) / 2, (renderedWidth - viewport.width) / 2),
                                        y: clamp((0.5 - initialCrop.focusY) * renderedHeight, -(renderedHeight - viewport.height) / 2, (renderedHeight - viewport.height) / 2),
                                    });
                                }
                            }}
                        />
                    )}
                    <div className="profile-crop-grid" aria-hidden="true" />
                </div>

                <div className="profile-crop-controls">
                    <Minus size={16} aria-hidden="true" />
                    <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.01"
                        value={zoom}
                        onChange={(event) => updateZoom(Number(event.target.value))}
                        aria-label="사진 확대 비율"
                    />
                    <Plus size={16} aria-hidden="true" />
                    <button type="button" className="profile-crop-reset" onClick={() => {
                        setZoom(1);
                        setOffset({ x: 0, y: 0 });
                    }}>
                        <RotateCcw size={14} /> 초기화
                    </button>
                </div>

                <footer className="profile-crop-actions">
                    <button type="button" className="profile-crop-cancel" onClick={onCancel}>취소</button>
                    <button type="button" className="profile-crop-apply" onClick={() => void handleApply()} disabled={!metrics || isSaving}>
                        {isSaving ? "적용 중…" : "사진 적용"}
                    </button>
                </footer>
            </section>
        </div>,
        document.body,
    );
}
