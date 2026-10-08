import fs from 'node:fs/promises';import sharp from 'sharp';
const svg=await fs.readFile('public/media/brand/launcher.svg');
await fs.mkdir('mobile/web/public/media/brand',{recursive:true});await fs.writeFile('mobile/web/public/media/brand/launcher.svg',svg);
const sizes=[16,24,32,48,64,128,256],images=await Promise.all(sizes.map(size=>sharp(svg).resize(size,size).png().toBuffer()));
const header=Buffer.alloc(6+images.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(images.length,4);let offset=header.length;
images.forEach((image,i)=>{const at=6+i*16;header[at]=header[at+1]=sizes[i]===256?0:sizes[i];header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(image.length,at+8);header.writeUInt32LE(offset,at+12);offset+=image.length;});
await fs.writeFile('resources/icon.ico',Buffer.concat([header,...images]));await sharp(svg).resize(512).png().toFile('resources/icon.png');
// Shared vector geometry, inset to Android's adaptive-icon safe area.
const mark=svg.toString().match(/<g id="mark">([\s\S]*?)<\/g>/)?.[1];if(!mark)throw Error('Shared brand geometry missing');
const paths=[...mark.matchAll(/<path fill="([^"]+)" d="([^"]+)"\s*\/>/g)].map(([,color,data])=>`<path android:fillColor="${color}" android:pathData="${data}"/>`).join('');
const foreground=`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><group android:scaleX=".72" android:scaleY=".72" android:translateX="15.12" android:translateY="15.12">${paths}</group></vector>`;
const res='mobile/android/app/src/main/res';await fs.writeFile(res+'/drawable/ic_launcher_foreground.xml',foreground);await fs.mkdir(res+'/mipmap-anydpi-v26',{recursive:true});await fs.writeFile(res+'/mipmap-anydpi-v26/ic_launcher.xml','<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/launcher_tile"/><foreground android:drawable="@drawable/ic_launcher_foreground"/><monochrome android:drawable="@drawable/ic_launcher_foreground"/></adaptive-icon>');
await fs.writeFile(res+'/values/launcher_colors.xml','<resources><color name="launcher_tile">#697ECC</color></resources>');
await fs.writeFile(res+'/drawable/ic_launcher.xml',foreground.replace('<group','<path android:fillColor="#697ECC" android:pathData="M0,0H108V108H0Z"/><group'));
console.log('Built shared x64/ia32 ICO and Android adaptive icon');
