import fs from 'fs';
import path from 'path';
import { authoredReferences } from '../src/lib/technique3d/author';
import { frontElbow, frontKnee, shoulderHipSeparation } from '../src/lib/technique3d/math';

const dir = path.join(__dirname, '../src/lib/technique3d/references');
fs.mkdirSync(dir, { recursive: true });
for (const reference of authoredReferences()) {
  const frame = reference.frames[reference.keyEventFrame];
  const elbow = frontElbow(frame, reference.hand);
  const knee = frontKnee(frame, reference.hand);
  const separation = shoulderHipSeparation(frame);
  if (elbow == null || knee == null || separation == null) throw new Error(`${reference.id} has no angles`);
  fs.writeFileSync(path.join(dir, `${reference.id}.json`), JSON.stringify(reference));
  console.log(`${reference.id} frames=${reference.frames.length} elbow=${elbow.toFixed(1)} knee=${knee.toFixed(1)} sep=${separation.toFixed(1)}`);
}
