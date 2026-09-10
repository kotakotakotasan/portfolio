/*
  画像は assets/img/ に決まったファイル名で「後から」届く前提（content/content.md参照）。
  拡張子も .png / .jpg / .jpeg / .webp のどれで来るか分からないため、ここで
  候補を順番に試して最初に読み込めたものを採用する。すべて失敗した場合の
  挙動は呼び出し側（動画facade / 図版スロット）が個別に決める。
  外部通信は発生しない（同一オリジンの相対パスに対するリクエストのみ）。
*/
(function () {
  "use strict";

  var IMG_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

  function resolveImage(baseName, onFound, onNotFound) {
    var i = 0;
    function tryNext() {
      if (i >= IMG_EXTENSIONS.length) {
        onNotFound();
        return;
      }
      var url = "assets/img/" + baseName + "." + IMG_EXTENSIONS[i];
      var probe = new Image();
      probe.onload = function () {
        onFound(url);
      };
      probe.onerror = function () {
        i += 1;
        tryNext();
      };
      probe.src = url;
    }
    tryNext();
  }

  /* 図版スロット：見つからなければブロックごと除去し、空きスペースを残さない */
  function initDiagramSlots() {
    var slots = document.querySelectorAll("[data-diagram]");
    slots.forEach(function (slot) {
      var baseName = slot.getAttribute("data-diagram");
      var img = slot.querySelector("img");
      resolveImage(
        baseName,
        function (url) {
          img.src = url;
          img.hidden = false;
        },
        function () {
          /* about__photoのように、キャプションが枠の外側の兄弟要素に
             なっている場合はキャプションごと消す（写真だけの穴を残さない） */
          var caption = slot.nextElementSibling;
          if (caption && caption.classList.contains("diagram-slot__caption")) {
            caption.remove();
          }
          slot.remove();
        }
      );
    });
  }

  /*
    動画facade：初期表示ではiframeを作らない。
    画像が見つかればプレースホルダ画像を、見つからなければタイトル＋再生数
    のCSS代替ブロックを表示する。再生ボタンが押された時にだけiframeを生成
    する（唯一の外部依存であるYouTube埋め込みを、ユーザー操作の後に遅延）。

    複数の動画facadeが同時に「再生中」になると、画面外に流れた前の動画の
    音声が鳴り続ける不具合になる。ページ全体で同時に生きているiframeは
    常に1つまでに制限し、別の動画を再生する・閉じるボタンを押すと、
    古いiframeをDOMから完全に削除して確実に停止させる。
  */
  function initVideoFacades() {
    var activeFacade = null;

    function stopFacade(facade) {
      var iframe = facade.querySelector("iframe");
      if (iframe) iframe.remove();
      var closeButton = facade.querySelector(".video-facade__close");
      if (closeButton) closeButton.remove();
      var playButton = facade.querySelector(".video-facade__play");
      if (playButton) playButton.hidden = false;
      if (activeFacade === facade) activeFacade = null;
    }

    var facades = document.querySelectorAll(".video-facade");
    facades.forEach(function (facade) {
      var baseName = facade.getAttribute("data-img-base");
      var img = facade.querySelector(".video-facade__img");
      var fallback = facade.querySelector(".video-facade__fallback");
      var playButton = facade.querySelector(".video-facade__play");

      if (baseName) {
        resolveImage(
          baseName,
          function (url) {
            img.src = url;
            img.hidden = false;
            fallback.hidden = true;
          },
          function () {
            fallback.hidden = false;
          }
        );
      } else {
        fallback.hidden = false;
      }

      playButton.addEventListener("click", function () {
        var videoId = facade.getAttribute("data-youtube-id");
        if (!videoId) return;

        if (activeFacade && activeFacade !== facade) {
          stopFacade(activeFacade);
        }

        var iframe = document.createElement("iframe");
        iframe.src =
          "https://www.youtube.com/embed/" + videoId + "?autoplay=1&rel=0";
        iframe.title = facade.getAttribute("data-title") || "YouTube video";
        iframe.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;

        var closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "video-facade__close";
        closeButton.setAttribute("aria-label", "動画を閉じる");
        closeButton.textContent = "✕";
        closeButton.addEventListener("click", function () {
          stopFacade(facade);
        });

        playButton.hidden = true;
        facade.appendChild(iframe);
        facade.appendChild(closeButton);
        activeFacade = facade;
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initDiagramSlots();
    initVideoFacades();
  });
})();
