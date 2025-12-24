export const DeviceConfig = {
    // Detect if likely running on a mobile or restricted device (like Pi)
    // This is a naive check; we can make it an explicit toggle later
    isLowPower: navigator.hardwareConcurrency <= 4 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),

    graphics: {
        // Pixel Ratio: Cap at 1.0 for Pi/Mobile to save GPU fill rate
        pixelRatio: (window.devicePixelRatio > 1 && (navigator.hardwareConcurrency <= 4)) ? 1 : Math.min(window.devicePixelRatio, 2),

        // Shadows: Expensive!
        shadowsEnabled: true,
        shadowMapType: 'BasicShadowMap', // downgrade from PCFSoft for Pi?

        // Antialiasing: High cost
        antialias: false,
    }
};
