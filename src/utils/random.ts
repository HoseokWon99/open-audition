
export const randomUUIDAsHex = (): string =>
    crypto.randomUUID().replaceAll('-', '');
