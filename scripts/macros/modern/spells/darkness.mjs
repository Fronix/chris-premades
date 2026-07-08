import {documentUtils, effectUtils} from '../../../proxy.mjs';
async function use({workflow}) {
    const concentrationEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
    const region = workflow.template;
    if (!region || !workflow.token) {
        if (concentrationEffect) await documentUtils.deleteDocument(concentrationEffect);
        return;
    }
    await documentUtils.update(region, {
        flags: {
            cat: {
                identifier: 'darkness'
            }
        }
    });
    const shape = region.shapes?.[0];
    const center = shape ? {x: shape.x ?? 0, y: shape.y ?? 0} : {x: workflow.token.center.x, y: workflow.token.center.y};
    const radius = shape?.radiusX ? (shape.radiusX / canvas.dimensions.distancePixels) : 15;
    const [darknessSource] = await region.parent.createEmbeddedDocuments('AmbientLight', [{
        config: {negative: true, dim: radius, bright: radius},
        x: center.x,
        y: center.y
    }]);
    if (darknessSource) await documentUtils.makeDependent(region, [darknessSource]);
    if (concentrationEffect) await documentUtils.makeDependent(concentrationEffect, [region]);
}
export const darkness = {
    name: 'Darkness',
    version: '2.0.0',
    rules: '2024',
    roll: [
        {
            pass: 'itemRollFinished',
            macro: use,
            priority: 50
        }
    ]
};
