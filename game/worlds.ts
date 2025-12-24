import { buildCampgroundWorld } from './worlds/campground';
import { buildCosmicHubWorld } from './worlds/hub';
import { buildMountainsWorld } from './worlds/mountains';
import { buildSequoiaForestWorld } from './worlds/forest';
import { buildCrystalCavesWorld } from './worlds/caves';
import { buildSkyIslandWorld } from './worlds/sky';
import { buildDeskviewWorld } from './worlds/deskview';
import { buildMemoryCropsWorld } from './worlds/crops';
import { buildWaterfallWorld } from './worlds/waterfalls';
import { addWorldElement, mat, rand } from './worlds/common';

// Re-export specific helpers if needed by scene.ts (though scene.ts mostly calls build* functions)
export {
    buildCampgroundWorld,
    buildCosmicHubWorld,
    buildMountainsWorld,
    buildSequoiaForestWorld,
    buildCrystalCavesWorld,
    buildSkyIslandWorld,
    buildDeskviewWorld,
    buildMemoryCropsWorld,
    buildWaterfallWorld,
    addWorldElement,
    mat,
    rand
};
