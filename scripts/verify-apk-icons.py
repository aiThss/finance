"""Verify compiled APK resources (including resource qualifiers), not source files.

Usage: python scripts/verify-apk-icons.py app.apk /path/to/aapt2
Only Python's standard library and the Android build-tools are needed.
"""
import re
import struct
import subprocess
import sys
import zipfile

apk, aapt = sys.argv[1:]


def dump(*args):
    return subprocess.check_output([aapt, "dump", *args, apk], text=True, encoding="utf-8")


resources = dump("resources")
entries = {}
for match in re.finditer(r"resource (0x[0-9a-f]+) ([^\s]+)\n(.*?)(?=\s+resource |\s+type |\Z)", resources, re.S):
    entries[match[2]] = (match[1], match[3])


def xml(path):
    return dump("xmltree", "--file", path)


manifest = xml("AndroidManifest.xml")
with zipfile.ZipFile(apk) as archive:
    foreground = entries["mipmap/ic_launcher_foreground"][1]
    variants = re.findall(r"\(([^)]+)\) \(file\) (\S+) type=PNG", foreground)
    assert foreground.count("(file)") == 5, foreground
    expected = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    assert len(variants) == 5 and {v[0].removesuffix("-v4") for v in variants} == set(expected), foreground
    for config, path in variants:
        data = archive.read(path)
        assert data[:8] == b"\x89PNG\r\n\x1a\n", path
        width, height = struct.unpack(">II", data[16:24])
        size = expected[config.removesuffix("-v4")]
        assert (width, height) == (size, size), (config, width, height)
    for name, attribute in [("ic_launcher", "icon"), ("ic_launcher_round", "roundIcon")]:
        resource_id, body = entries["mipmap/" + name]
        assert re.search(rf"android:{attribute}\([^)]*\)=@{resource_id}", manifest), manifest
        paths = re.findall(r"\(anydpi-v26\) \(file\) (\S+) type=XML", body)
        assert len(paths) == 1, body
        adaptive = xml(paths[0])
        assert "E: adaptive-icon" in adaptive, adaptive
        for element, target in [("foreground", "mipmap/ic_launcher_foreground"),
                                ("background", "drawable/ic_launcher_background")]:
            assert re.search(rf"E: {element}.*?android:drawable\([^)]*\)=@{entries[target][0]}", adaptive, re.S), adaptive
    bg = entries["drawable/ic_launcher_background"][1]
    bg_paths = re.findall(r"\(\) \(file\) (\S+) type=XML", bg)
    assert len(bg_paths) == 1, bg
    vector = xml(bg_paths[0])
    assert "E: vector" in vector, vector
    for dimension in ["width", "height"]:
        assert re.search(rf"android:{dimension}\([^)]*\)=108\.000000dp", vector), vector
    assert "#ff171b19" in vector.lower(), vector
    # Reject any future bitmap tagged anydpi, even under a renamed resource.
    assert not re.search(r"\(anydpi[^)]*\).*type=PNG", resources), "Raster in anydpi"
print("APK icon manifest, adaptive references, densities, PNG dimensions and background verified.")
