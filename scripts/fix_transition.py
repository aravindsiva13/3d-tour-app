import re

with open("components/PanoramaViewer.tsx", "r") as f:
    content = f.read()

# 1. Replace IncomingSphere
old_incoming_sphere = """// The destination panorama, drawn *over* the current one and faded in.
  // Sits on a slightly smaller sphere with depth testing off so it always wins.
  const IncomingSphere = ({ texture, materialRef }: {
    texture: THREE.Texture,
    materialRef: React.RefObject<THREE.MeshBasicMaterial | null>
  }) => (
    <mesh scale={[-1, 1, 1]} renderOrder={2}>
      <sphereGeometry args={[480, 60, 40]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        side={THREE.DoubleSide}
        transparent
        opacity={0}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );"""

new_fade_overlay = """// A black sphere overlay used to dip-to-black during transitions
  // Sits on a slightly smaller sphere with depth testing off so it always wins.
  const TransitionFadeOverlay = ({ materialRef }: {
    materialRef: React.RefObject<THREE.MeshBasicMaterial | null>
  }) => (
    <mesh scale={[-1, 1, 1]} renderOrder={2}>
      <sphereGeometry args={[480, 60, 40]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#000000"
        side={THREE.DoubleSide}
        transparent
        opacity={0}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );"""

content = content.replace(old_incoming_sphere, new_fade_overlay)

# 2. Update the JSX rendering IncomingSphere
content = content.replace(
    "{/* Destination panorama, crossfaded over the current one */}\n          {pending && <IncomingSphere texture={pending.texture} materialRef={incomingMatRef} />}",
    "{/* Dip to black transition overlay */}\n          {pending && <TransitionFadeOverlay materialRef={incomingMatRef} />}"
)

# 3. Update the TransitionController onComplete
old_on_complete = """      onComplete: () => {
        // Overlay is fully opaque here, so swapping the base texture underneath
        // it is invisible — no flash, no black frame.
        onCommit(pending.nodeId);
        state.blend = 0;
        if (materialRef.current) materialRef.current.opacity = 0;

        // Arrival: FOV springs back out, which reads as "you stepped forward".
        arrivalRef.current = gsap.to(state, {
          fov: NORMAL_FOV,
          duration: 0.75,
          ease: 'power3.out',
          onUpdate: () => {
            pCam.fov = state.fov;
            pCam.updateProjectionMatrix();
          },
          onComplete: () => {
            if (oc) {
              oc.enabled = true;
              oc.enableDamping = hadDamping;
            }
            busy.current = false;
          }
        });
      }"""

new_on_complete = """      onComplete: () => {
        // Overlay is fully black here. We can now reset the camera to look straight ahead
        // (fixing the issue where you enter a room looking at the floor or a wall)
        if (oc) {
          oc.setAzimuthalAngle(0);
          oc.setPolarAngle(Math.PI / 2); // Eye-level horizontal
          oc.update();
        }

        // Swap the base texture underneath the black overlay
        onCommit(pending.nodeId);

        // Fade from black while FOV springs back out
        arrivalRef.current = gsap.to(state, {
          fov: NORMAL_FOV,
          blend: 0,
          duration: 0.75,
          ease: 'power3.out',
          onUpdate: () => {
            pCam.fov = state.fov;
            pCam.updateProjectionMatrix();
            if (materialRef.current) materialRef.current.opacity = state.blend;
          },
          onComplete: () => {
            if (oc) {
              oc.enabled = true;
              oc.enableDamping = hadDamping;
            }
            busy.current = false;
          }
        });
      }"""

content = content.replace(old_on_complete, new_on_complete)


with open("components/PanoramaViewer.tsx", "w") as f:
    f.write(content)

print("Updated transition logic")
