# Sudden Death

A 3D first-person murder mystery set inside the Bay City Bruisers' performance center on Championship Eve. You play **Detective Eighty-Five**, a former tight end who blocks for the innocent and catches the guilty.

The game is a single self-contained page (`index.html`). Three.js comes from cdnjs, and everything else is generated in code: rooms, furniture, characters, textures and sound.

## Modes

- **The Last Playbook** (story): one hand-written case with 7 suspects and 20 pieces of evidence. Work out who killed the offensive coordinator, how, and why.
- **Overtime** (random): the owner is found on the 50-yard line, and the killer, weapon, room and alibis are reshuffled every game. The shoe print, the handedness of the print on the weapon, and the badge class in the door log always point to exactly one suspect. A lying alibi is another route to the answer.

You get four downs: each wrong accusation burns one. Three timeouts give hints. Five golden footballs are hidden around the building.

## Controls

| Desktop | Touch |
| --- | --- |
| WASD / arrows to move, mouse to look (click the view first) | Drag the left side to move, the right side to look |
| E or Space to inspect / talk | Gold button |
| F to block, Shift to sprint | Block button |
| Tab or J for the Playbook, M for the map, Esc to pause | Playbook / Menu buttons |

## Building

The source lives in `src/` (HTML shell, CSS and JS modules). `./build.sh` concatenates it into `index.html`.

```
src/head.html        title, fonts, styles
src/body.html        HUD, menus and overlays
src/js/00-util.js    helpers, storage, synthesized audio
src/js/10-textures.js procedural canvas textures
src/js/20-world.js   the facility: rooms, furniture, hotspots, lights, collisions
src/js/30-people.js  character models and behavior
src/js/40-data.js    cast, weapons, and the story case
src/js/50-cases.js   the random case generator
src/js/60-game.js    game state, interaction, notebook, accusations, scoring
src/js/70-main.js    movement, physics, main loop, boot
```
