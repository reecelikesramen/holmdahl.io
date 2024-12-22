import * as JSON5 from "json5";
import Bowser from "bowser";
import { render } from "preact";
import type { VNode } from "preact";
import { useEffect, useState, useCallback } from "preact/hooks";
import {
  saveScene,
  loadScene,
  isSceneModified,
  initSceneIndex,
  setModifiedContent,
  clearModifiedContent,
} from "./utils/sceneStorage";
import SplitPane, { Pane } from "split-pane-react";
import "split-pane-react/esm/themes/default.css";
import { JsonEditor } from "./components/JsonEditor";
import { AssetList } from "./components/AssetList";
import { Raytracer } from "./components/Raytracer";
import { SceneList } from "./components/SceneList";
import init, { initThreadPool } from "./pkg/raytracer_wasm.js";
import { db } from "./utils/db";

function App() {
  const [sceneCode, setSceneCode] = useState("");
  const [wasmModule, setWasmModule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilename, setCurrentFilename] = useState<string | null>(
    "cornell_room_quad.json",
  );

  const handleSceneDelete = async (filename: string) => {
    console.log("Handling scene deletion:", {
      deletingFilename: filename,
      currentFilename,
      isCurrentScene: filename === currentFilename,
    });

    // Get remaining scenes before deletion
    const remainingScenes = await db.scenes
      .filter((s) => s.filename !== filename)
      .toArray();

    // If this is the current scene, handle selection first
    if (filename === currentFilename) {
      console.log("Deleting current scene, selecting new scene");
      if (remainingScenes.length > 0) {
        const nextScene = remainingScenes[0];
        const { content, isRemote } = await loadScene(nextScene.filename);
        setSceneCode(content);
        setIsRemoteFile(isRemote);
        setOriginalContent(content);
        setCurrentFilename(nextScene.filename);
        setIsModified(false);
      } else {
        setSceneCode("");
        setCurrentFilename(null);
        setIsRemoteFile(false);
        setOriginalContent("");
        setIsModified(false);
      }
    }

    // Now perform the actual deletion
    await db.scenes.where("filename").equals(filename).delete();
    window.dispatchEvent(new Event("scenesUpdated"));
  };
  const [isModified, setIsModified] = useState(false);
  const [originalContent, setOriginalContent] = useState("");
  const [isRemoteFile, setIsRemoteFile] = useState(true);

  useEffect(() => {
    const initWasm = async () => {
      try {
        await init();
        await initThreadPool(navigator.hardwareConcurrency);
        setWasmModule(true);
      } catch (error) {
        console.error("Failed to initialize WASM:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initWasm();
  }, []);

  const handleSceneChange = (val: string) => {
    try {
      let json = JSON5.parse(val);
      const formatted = JSON.stringify(json, null, 2);
      console.log("Scene change:", {
        currentFilename,
        formatted: formatted.substring(0, 50) + "...",
        originalContent: originalContent.substring(0, 50) + "...",
        isDifferent: formatted !== originalContent,
      });
      setSceneCode(formatted);
      setIsModified(formatted !== originalContent);
      if (currentFilename && formatted !== originalContent) {
        console.log("Setting modified content for:", currentFilename);
        setModifiedContent(currentFilename, formatted);
      }
    } catch (e) {
      // console.log("Error parsing JSON:", e)
    }
  };

  // Load initial scene
  useEffect(() => {
    const loadInitialScene = async () => {
      try {
        await initSceneIndex();
        const { content, isRemote } = await loadScene("cornell_room_quad.json");
        setSceneCode(content);
        setCurrentFilename("cornell_room_quad.json");
        setOriginalContent(content);
        setIsRemoteFile(isRemote);
        setIsModified(false);
      } catch (error) {
        console.error("Failed to load initial scene:", error);
      }
    };

    loadInitialScene();
  }, []);

  const handleSaveAs = useCallback(async () => {
    const filename = prompt("Enter filename for scene:", "new_scene.json");
    if (!filename) return;

    // Ensure filename has .json extension
    const finalFilename = filename.endsWith(".json")
      ? filename
      : `${filename}.json`;

    try {
      // Check if filename already exists in DB
      const existingScene = await db.scenes
        .where("filename")
        .equals(finalFilename)
        .first();
      if (existingScene?.path) {
        alert("Cannot use the same filename as a built-in scene");
        return;
      }

      // If we're saving from a built-in scene, clear its modifications
      if (currentFilename && isRemoteFile) {
        clearModifiedContent(currentFilename);
      }

      await saveScene(finalFilename, sceneCode);
      setCurrentFilename(finalFilename);
      setOriginalContent(sceneCode);
      setIsModified(false);
      setIsRemoteFile(false);
    } catch (error) {
      console.error("Failed to save scene:", error);
      alert("Failed to save scene");
    }
  }, [sceneCode, currentFilename, isRemoteFile]);

  const handleSave = useCallback(async () => {
    // For built-in files, always do Save As
    if (!currentFilename || isRemoteFile) {
      handleSaveAs();
      return;
    }

    try {
      await saveScene(currentFilename, sceneCode);
      setOriginalContent(sceneCode);
      setIsModified(false);
    } catch (error) {
      console.error("Failed to save scene:", error);
      alert("Failed to save scene");
    }
  }, [currentFilename, sceneCode, isRemoteFile, handleSaveAs]);

  // Add beforeunload handler to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isModified) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isModified]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const browser = Bowser.getParser(window.navigator.userAgent);
      const isMac = browser.getOS().name === "macOS";
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (modifierKey) {
        if (e.shiftKey && (e.key === "S" || e.key === "s")) {
          // Mac: CMD+SHIFT+S, Windows/Linux: CTRL+SHIFT+S
          e.preventDefault();
          handleSaveAs();
        } else if (e.key === "s") {
          // Mac: CMD+S, Windows/Linux: CTRL+S
          e.preventDefault();
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleSave, handleSaveAs]);

  if (isLoading) {
    return <div>Loading WebAssembly modules...</div>;
  }

  const [sizes, setSizes] = useState(["50%", "50%", 0, 0]);
  const [showAssets, setShowAssets] = useState(false);
  const [showScenes, setShowScenes] = useState(false);

  useEffect(() => {
    setSizes((prev) => {
      const baseSize =
        showScenes && showAssets
          ? "30%"
          : showScenes || showAssets
            ? "40%"
            : "50%";

      return [
        showScenes ? "20%" : 0,
        baseSize,
        baseSize,
        showAssets ? "20%" : 0,
      ];
    });
  }, [showAssets, showScenes]);

  return (
    <SplitPane
      split="vertical"
      sizes={sizes}
      onChange={setSizes}
      sashRender={() => (<div className="split-pane-divider" />) as VNode}
    >
      {showScenes && (
        <Pane minSize={120}>
          <SceneList
            onSceneDelete={handleSceneDelete}
            onSceneSelect={async (content, path, isRemote) => {
              console.log("Scene select called with:", {
                contentLength: content?.length || 0,
                path,
                isRemote,
                previousFile: currentFilename,
              });

              // Update all state synchronously
              setSceneCode(content);
              setIsRemoteFile(isRemote);
              setOriginalContent(content);
              setIsModified(path ? isSceneModified(path) : false);
              setCurrentFilename(path);

              // Wait for state updates to complete
              await new Promise((resolve) => setTimeout(resolve, 0));

              console.log("After state updates:", {
                newSceneCode: content?.substring(0, 100) + "...",
                newPath: path,
                newIsRemote: isRemote,
                currentFilename: path,
              });
            }}
            onClose={() => setShowScenes(false)}
            currentFile={currentFilename}
          />
        </Pane>
      )}
      <Pane minSize={120}>
        <div className="editor-pane">
          <div className="pane-title">
            {!showScenes && (
              <button
                onClick={() => setShowScenes(true)}
                style={{ left: "8px", right: "auto" }}
              >
                ◪
              </button>
            )}
            Scene Editor {currentFilename ? `— ${currentFilename}` : ""}
            {isModified && <span className="modified-indicator">●</span>}
          </div>
          <div className="editor-container">
            <JsonEditor
              value={sceneCode}
              onChange={handleSceneChange}
              onSave={handleSave}
              isModified={isModified}
            />
          </div>
        </div>
      </Pane>
      <Pane minSize={120}>
        <div className="canvas-pane">
          <div className="pane-title">
            Preview
            {!showAssets && (
              <button onClick={() => setShowAssets(true)}>◪</button>
            )}
          </div>
          <div className="canvas-container">
            <Raytracer sceneJson={sceneCode} wasmModule={wasmModule} />
          </div>
        </div>
      </Pane>
      {showAssets && (
        <Pane minSize={120}>
          <div className="editor-pane">
            <div className="pane-title">
              Assets
              <button onClick={() => setShowAssets(false)}>✕</button>
            </div>
            <div className="list-container">
              <AssetList onClose={() => setShowAssets(false)} />
            </div>
          </div>
        </Pane>
      )}
    </SplitPane>
  );
}

render(<App />, document.getElementById("app")!);
