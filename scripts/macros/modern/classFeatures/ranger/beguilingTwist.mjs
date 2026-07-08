import {activityUtils, dialogUtils, effectUtils} from '../../../../proxy.mjs';
async function use({workflow}) {
    if (workflow.targets.size !== 1 || !workflow.failedSaves.size) return;
    const selection = await dialogUtils.buttonDialog(workflow.item.name, _loc('CHRISPREMADES.Macros.BeguilingTwist.Select'), [
        ['DND5E.ConCharmed', 'charmed'],
        ['DND5E.ConFrightened', 'frightened']
    ]);
    if (!selection) return;
    const dc = activityUtils.getSaveDC(workflow.activity) ?? 10;
    const effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        type: 'base',
        origin: workflow.item.uuid,
        duration: activityUtils.getEffectDuration(workflow.activity),
        statuses: [selection],
        system: {
            changes: [
                {key: 'flags.midi-qol.OverTime', type: 'custom', value: 'label=' + workflow.item.name + ',turn=end,saveDC=' + dc + ',saveAbility=wis,rollType=save,saveRemove=true', phase: 'initial', priority: 20}
            ]
        }
    };
    await effectUtils.createEffects(workflow.targets.first().actor, [effectData]);
}
export const beguilingTwist = {
    name: 'Beguiling Twist',
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
