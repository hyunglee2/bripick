// 350 x 450 증명사진 비율을 PDF에서도 선명하도록 2배 해상도로 저장합니다.
const PROFILE_PHOTO_WIDTH = 700;
const PROFILE_PHOTO_HEIGHT = 900;
const PROFILE_PHOTO_QUALITY = 0.86;
const PROFILE_PHOTO_SOURCE_QUALITY = 0.8;
const PROFILE_PHOTO_SOURCE_MAX_SIZE = 1600;

export type ProfilePhotoCrop = {
    focusX: number;
    focusY: number;
    zoom: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function readImageSource(source: Blob | string): Promise<string> {
    if (typeof source === "string") return Promise.resolve(source);

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("프로필 사진 파일을 읽을 수 없습니다."));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(source);
    });
}

function loadImage(source: Blob | string): Promise<HTMLImageElement> {
    return readImageSource(source).then((url) => new Promise((resolve, reject) => {
        const image = new Image();
        image.onerror = () => reject(new Error("프로필 사진을 불러올 수 없습니다."));
        image.onload = () => resolve(image);
        image.src = url;
    }));
}

export async function createProfilePhotoSourceDataUrl(file: File): Promise<string> {
    const image = await loadImage(file);
    const scale = Math.min(1, PROFILE_PHOTO_SOURCE_MAX_SIZE / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("프로필 사진 원본을 변환할 수 없습니다.");

    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", PROFILE_PHOTO_SOURCE_QUALITY);
}

export async function createProfilePhotoDataUrl(
    source: Blob | string,
    crop: ProfilePhotoCrop = { focusX: 0.5, focusY: 0.5, zoom: 1 },
): Promise<string> {
    const image = await loadImage(source);
    return new Promise((resolve, reject) => {
                const canvas = document.createElement("canvas");
                const scale = Math.max(
                    PROFILE_PHOTO_WIDTH / image.width,
                    PROFILE_PHOTO_HEIGHT / image.height,
                ) * clamp(crop.zoom, 1, 3);
                const width = image.width * scale;
                const height = image.height * scale;
                const offsetX = clamp(
                    PROFILE_PHOTO_WIDTH / 2 - clamp(crop.focusX, 0, 1) * width,
                    PROFILE_PHOTO_WIDTH - width,
                    0,
                );
                const offsetY = clamp(
                    PROFILE_PHOTO_HEIGHT / 2 - clamp(crop.focusY, 0, 1) * height,
                    PROFILE_PHOTO_HEIGHT - height,
                    0,
                );
                const context = canvas.getContext("2d");

                if (!context) {
                    reject(new Error("프로필 사진을 변환할 수 없습니다."));
                    return;
                }

                canvas.width = PROFILE_PHOTO_WIDTH;
                canvas.height = PROFILE_PHOTO_HEIGHT;
                context.drawImage(
                    image,
                    offsetX,
                    offsetY,
                    width,
                    height,
                );
                resolve(canvas.toDataURL("image/jpeg", PROFILE_PHOTO_QUALITY));
    });
}
