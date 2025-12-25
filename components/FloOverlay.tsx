import React, { useEffect } from 'react';
// @ts-ignore
import FloUI from '../ui/flo-ui.js';
// @ts-ignore
import RadialMenu from '../ui/radial-menu.js';

export const FloOverlay: React.FC = () => {
    useEffect(() => {
        // Initialize Flo UI (DOM overlay)
        const flo = new FloUI();
        (window as any).flo = flo;

        // Initialize radial menu attached to Flo
        const radialMenu = new RadialMenu({
            radius: 100,
            numOptions: 6
        });
        (window as any).radialMenu = radialMenu;

        // Define menu options
        const menuOptions = [
            { icon: '💬', label: 'Chat', panel: 'chat' },
            { icon: '🎨', label: 'Canvas', panel: 'canvas' },
            { icon: '📊', label: 'Data', panel: 'data' },
            { icon: '⚙️', label: 'Settings', panel: 'settings' },
            { icon: '🔍', label: 'Search', panel: 'search' },
            { icon: '📁', label: 'Files', panel: 'files' }
        ];

        // Attach menu to Flo's container
        if (flo.container) {
            radialMenu.init(flo.container, menuOptions);
        }

        // Handle menu selection
        // Handle menu selection
        radialMenu.onOptionSelect = (option: any) => {
            console.log('Selected:', option.label);

            if (option.panel === 'settings') {
                window.dispatchEvent(new CustomEvent('open-admin-panel'));
            } else if (option.panel === 'chat') {
                // Trigger the Mechanical Arm / Side Panel
                const event = new CustomEvent('open-side-panel', {
                    detail: {
                        panel: option.panel,
                        label: option.label
                    }
                });
                window.dispatchEvent(event);
            } else {
                console.log('Interaction not implemented for:', option.label);
                // For now, open side panel for others too just to be responsive
                const event = new CustomEvent('open-side-panel', {
                    detail: {
                        panel: option.panel,
                        label: option.label
                    }
                });
                window.dispatchEvent(event);
            }
        };

        return () => {
            if (flo && typeof flo.destroy === 'function') flo.destroy();
            if (radialMenu && typeof radialMenu.destroy === 'function') radialMenu.destroy();
        };
    }, []);

    return null;
};
