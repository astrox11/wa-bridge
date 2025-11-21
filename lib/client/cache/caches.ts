export const cacheVersion = 1;
export const cacheName = `astrobridge-client-cache-v${cacheVersion}`;
export const cachePrefix = function (uid: string) {
    return `astrobridge-client-cache-${uid}-v${cacheVersion}`;
}