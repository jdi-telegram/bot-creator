export const mergePath = (path: string, suffix: string) => {
    if (!path) return '';
    if (!suffix) return path;
    if (path[path.length-1] !== '/' && suffix[0] !== '/') {
        return path + '/' + suffix;
    }
    if (path[path.length-1] === '/' && path[0] === '/') {
        return path.slice(0, path.length-2) + suffix;
    }
    return path + suffix;
}
