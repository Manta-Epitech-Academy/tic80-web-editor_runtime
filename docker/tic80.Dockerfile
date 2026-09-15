FROM emscripten/emsdk:latest

# Ruby required by TIC-80 build scripts (CI uses 2.6)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ruby-full cmake ninja-build \
  && rm -rf /var/lib/apt/lists/*

# Pinned: apply-embed.sh rewrites upstream sources by pattern, and upstream
# main moves under it (af4d6ac, 2026-09-15, changed the Escape handling in
# studio.c and the patch stopped applying). 4aba09c is the last main commit
# before that. To move the pin, run docker/tic80/apply-embed.sh against a
# checkout of the candidate first; it fails fast, the compile does not.
ARG TIC80_REF=4aba09c98f1e5028b82765be1647677b08d35942
WORKDIR /src
# A sha is not a branch, so no --branch/--depth: a blobless clone, then the
# checkout, then the submodules (shallow — none of their history is wanted).
RUN git clone --filter=blob:none https://github.com/nesbox/TIC-80.git . \
    && git checkout --detach ${TIC80_REF} \
    && git submodule update --init --recursive --depth 1

COPY docker/tic80/ /embed/
RUN chmod +x /embed/apply-embed.sh && /embed/apply-embed.sh /src

WORKDIR /src/build
RUN emcmake cmake \
      -DBUILD_SDLGPU=Off \
      -DBUILD_STATIC=On \
      -DCMAKE_BUILD_TYPE=Release \
      -DBUILD_WITH_ALL=On \
      -DBUILD_PRO=On \
      -DTIC80_EMBED_API=On \
      -G Ninja \
      .. --fresh \
  && cmake --build . --parallel

COPY docker/export-tic80.sh /export-tic80.sh
RUN chmod +x /export-tic80.sh \
  && /export-tic80.sh /src/build/bin /export

VOLUME /export
CMD ["cp", "-r", "/export/.", "/out/"]
