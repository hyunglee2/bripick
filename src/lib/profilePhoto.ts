const PROFILE_PHOTO_SIZE = 640;
const PROFILE_PHOTO_QUALITY = 0.86;

export function createProfilePhotoDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(new Error("프로필 사진 파일을 읽을 수 없습니다."));
        reader.onload = () => {
            const image = new Image();

            image.onerror = () => reject(new Error("프로필 사진을 불러올 수 없습니다."));
            image.onload = () => {
                const canvas = document.createElement("canvas");
                const scale = Math.max(
                    PROFILE_PHOTO_SIZE / image.width,
                    PROFILE_PHOTO_SIZE / image.height,
                );
                const width = image.width * scale;
                const height = image.height * scale;
                const context = canvas.getContext("2d");

                if (!context) {
                    reject(new Error("프로필 사진을 변환할 수 없습니다."));
                    return;
                }

                canvas.width = PROFILE_PHOTO_SIZE;
                canvas.height = PROFILE_PHOTO_SIZE;
                context.drawImage(
                    image,
                    (PROFILE_PHOTO_SIZE - width) / 2,
                    (PROFILE_PHOTO_SIZE - height) / 2,
                    width,
                    height,
                );
                resolve(canvas.toDataURL("image/jpeg", PROFILE_PHOTO_QUALITY));
            };
            image.src = String(reader.result);
        };

        reader.readAsDataURL(file);
    });
}
