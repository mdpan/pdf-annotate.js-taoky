import PDFJSAnnotate from '../PDFJSAnnotate';
import config from '../config';
import {
  addEventListener,
  removeEventListener
} from './event';
import {
  BORDER_COLOR,
  disableUserSelect,
  enableUserSelect,
  findSVGContainer,
  findSVGAtPoint,
  getOffsetAnnotationRect,
  getMetadata,
  convertToSvgPoint,
  scaleDown
} from './utils';
import { appendChild } from '../render/appendChild';

let _enabled = false;
let isDragging = false;
let overlay;
let dragOffsetX, dragOffsetY, dragStartX, dragStartY;
const OVERLAY_BORDER_SIZE = 3;

/**
 * Create an overlay for editing an annotation.
 *
 * @param {Element} target The annotation element to apply overlay for
 */
export function createEditOverlay(target) {
  destroyEditOverlay();
  overlay = document.createElement('div');
  let anchor = document.createElement('a');
  let parentNode = findSVGContainer(target).parentNode;
  let id = target.getAttribute('data-pdf-annotate-id');
  let type = target.getAttribute('data-pdf-annotate-type');
  let content = target.getAttribute('data-pdf-annotate-content');
  let color = target.getAttribute('data-pdf-annotate-color');
  let rect = getOffsetAnnotationRect(target, true);
  let styleLeft = rect.left - OVERLAY_BORDER_SIZE;
  let styleTop = rect.top - OVERLAY_BORDER_SIZE;

  overlay.setAttribute('id', 'pdf-annotate-edit-overlay');
  overlay.setAttribute('data-target-id', id);
  overlay.setAttribute('data-pdf-annotate-type', type);
  overlay.style.boxSizing = 'content-box';
  overlay.style.position = 'absolute';
  overlay.style.top = `${styleTop}px`;
  overlay.style.left = `${styleLeft}px`;
  if ('textbox' === type) {
    overlay.style.background = '#fff';
    overlay.style.width = rect.width>134 ?  rect.width + 'px' : '134px';
    overlay.style.height = rect.height > 20 ? rect.height + 'px' : '20px';
  } else {
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }
  overlay.style.border = `${OVERLAY_BORDER_SIZE}px solid ${BORDER_COLOR}`;
  overlay.style.borderRadius = `${OVERLAY_BORDER_SIZE}px`;
  overlay.setAttribute('data-pdf-annotate-content', content);
  overlay.setAttribute('data-pdf-annotate-color', color);  
  overlay.style.zIndex = 20100;

  anchor.innerHTML = '×';
  anchor.setAttribute('href', 'javascript://');
  anchor.style.background = '#fff';
  anchor.style.borderRadius = '20px';
  anchor.style.border = '1px solid #bbb';
  anchor.style.color = '#bbb';
  anchor.style.fontSize = '16px';
  anchor.style.padding = '2px';
  anchor.style.textAlign = 'center';
  anchor.style.textDecoration = 'none';
  anchor.style.position = 'absolute';
  anchor.style.top = '-13px';
  anchor.style.right = '-13px';
  anchor.style.width = '25px';
  anchor.style.height = '25px';

  overlay.appendChild(anchor);

  if ('point' === type) {
    //var spandiv = document.createElement('div');
    //spandiv.innerHTML = content;
    let spantextarea = document.createElement('textarea');
    spantextarea.setAttribute('id', id + 'textarea');
    spantextarea.value = content;
    spantextarea.style.position = 'absolute';
    spantextarea.style.top = rect.height + 'px';
    spantextarea.style.left = (rect.width - 13) + 'px';
    spantextarea.style.background = color;
    spantextarea.style.width = '275px';
    spantextarea.rows = 5;
    overlay.appendChild(spantextarea);

    spantextarea.addEventListener('onfocus', inputDocumentClick);
    spantextarea.addEventListener('change', editAnnotation);
    spantextarea.addEventListener('click', inputDocumentClick);
    /*
    spandiv.style.border = '1px solid #bbb';
    spandiv.style.color = '#000000';
    spandiv.style.fontSize = '16px';
    spandiv.style.padding = '2px';
    spandiv.style.textAlign = 'left';
    spandiv.style.textDecoration = 'none';
    spandiv.style.position = 'absolute';
    spandiv.style.top =rect.height + 'px';
    spandiv.style.left = (rect.width -13) + 'px';
    
    overlay.appendChild(spandiv);
    //20210209
    spandiv.addEventListener('click', inputDocumentClick);*/
  }
  else if ('textbox' === type) {
    let spaninput = document.createElement('input');
    spaninput.setAttribute('id', id + 'input');
    spaninput.type = 'text';
    spaninput.style.textAlign = 'left';
    spaninput.style.height = rect.height + 'px';
    spaninput.value = content;


    spaninput.style.border = '0px solid ';

    let textSize = target.getAttribute('font-size');
    spaninput.style.fontSize = textSize + 'px';
    spaninput.style.width = rect.width > 128 ? rect.width + 'px' : '128px';

    overlay.appendChild(spaninput);
    spaninput.addEventListener('onfocus', inputDocumentClick);
    spaninput.addEventListener('click', inputDocumentClick);
    spaninput.addEventListener('change', editAnnotation);

  } else if ('sign' === type) {
    overlay.addEventListener('click', inputDocumentClickS);
  }

  parentNode.appendChild(overlay);
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keyup', handleDocumentKeyup);
  document.addEventListener('mousedown', handleDocumentMousedown);
  anchor.addEventListener('click', deleteAnnotation);
  anchor.addEventListener('mouseover', () => {
    anchor.style.color = '#35A4DC';
    anchor.style.borderColor = '#999';
    anchor.style.boxShadow = '0 1px 1px #ccc';
  });
  anchor.addEventListener('mouseout', () => {
    anchor.style.color = '#bbb';
    anchor.style.borderColor = '#bbb';
    anchor.style.boxShadow = '';
  });
  overlay.addEventListener('mouseover', () => {
    if (!isDragging) { anchor.style.display = ''; }
  });
  overlay.addEventListener('mouseout', () => {
    anchor.style.display = 'none';
  });
}

/**
 * Destroy the edit overlay if it exists.
 */
export function destroyEditOverlay() {
  if (overlay) {
    overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keyup', handleDocumentKeyup);
  document.removeEventListener('mousedown', handleDocumentMousedown);
  document.removeEventListener('mousemove', handleDocumentMousemove);
  document.removeEventListener('mouseup', handleDocumentMouseup);
  enableUserSelect();
}

/**
 * Delete currently selected annotation
 */
function deleteAnnotation() {
  if (!overlay) {
    return;
  }

  let annotationId = overlay.getAttribute('data-target-id');
  let svg = overlay.parentNode.querySelector(config.annotationSvgQuery());
  let _getMetadata = getMetadata(svg);
  let documentId = _getMetadata.documentId;

  PDFJSAnnotate.getStoreAdapter().deleteAnnotation(documentId, annotationId).then(() => {
    let nodes = document.querySelectorAll(`[data-pdf-annotate-id="${annotationId}"]`);

    [...nodes].forEach((n) => {
      n.parentNode.removeChild(n);
    });
  });

  destroyEditOverlay();
  e.stopPropagation();
}

/** 20210209
* edit annotation
*/
function editAnnotation() {
  if (!overlay) {
      return;
  }
  let annotationId = overlay.getAttribute('data-target-id');
  let type = overlay.getAttribute('data-pdf-annotate-type');
  let nodes = document.querySelectorAll('[data-pdf-annotate-id="' + annotationId + '"]');
  let svg = overlay.parentNode.querySelector('svg.annotationLayer');
  let val;
  if ('textbox' === type) {
      val = document.getElementById(annotationId + 'input').value;
  } else {
      val = document.getElementById(annotationId + 'textarea').value;
  }

  let _getMetadata = getMetadata(svg);
  let documentId = _getMetadata.documentId;

  [...nodes].forEach((n) => {
      n.setAttribute('data-pdf-annotate-content', val);
      if ('textbox' === type) {
          n.innerHTML = val;
      }
  });

  let promise = PDFJSAnnotate.getStoreAdapter().getAnnotation(documentId, annotationId);
  promise.then((annotation) => {
      annotation.content = val;
      PDFJSAnnotate.getStoreAdapter().editAnnotation(documentId, annotationId, annotation);
  });

  destroyEditOverlay();
}

function inputDocumentClick(e) {
  e.stopPropagation();
}

function inputDocumentClickS(e) {
  $("#signdialogbutton").attr("sign-id", overlay.getAttribute('data-target-id'));
  document.getElementById("signdialogbutton").click();
  e.stopPropagation();
}

/**
 * Handle document.click event
 *
 * @param {Event} e The DOM event that needs to be handled
 */
function handleDocumentClick(e) {
  if (!findSVGAtPoint(e.clientX, e.clientY)) { return; }

  // Remove current overlay
  let overlay = document.getElementById('pdf-annotate-edit-overlay');
  if (overlay) {
    if (isDragging || e.target === overlay) {
      return;
    }

    destroyEditOverlay();
  }
}

/**
 * Handle document.keyup event
 *
 * @param {KeyboardEvent} e The DOM event that needs to be handled
 */
function handleDocumentKeyup(e) {
  // keyCode is deprecated, so prefer the newer "key" method if possible
  let keyTest;
  if (e.key) {
    keyTest = e.key.toLowerCase() === 'delete' || e.key.toLowerCase() === 'backspace';
  }
  else {
    keyTest = e.keyCode === 8 || e.keyCode === 46;
  }
  if (overlay && keyTest &&
      e.target.nodeName.toLowerCase() !== 'textarea' &&
      e.target.nodeName.toLowerCase() !== 'input') {
    e.preventDefault();
    deleteAnnotation();
  }
}

/**
 * Handle document.mousedown event
 *
 * @param {Event} e The DOM event that needs to be handled
 */
function handleDocumentMousedown(e) {
  if (e.target !== overlay) {
    return;
  }

  // Highlight and strikeout annotations are bound to text within the document.
  // It doesn't make sense to allow repositioning these types of annotations.
  let annotationId = overlay.getAttribute('data-target-id');
  let target = document.querySelector(`[data-pdf-annotate-id="${annotationId}"]`);
  let type = target.getAttribute('data-pdf-annotate-type');

  if (type === 'highlight' || type === 'strikeout') { return; }

  isDragging = true;
  dragOffsetX = e.clientX;
  dragOffsetY = e.clientY;
  dragStartX = overlay.offsetLeft;
  dragStartY = overlay.offsetTop;

  if ('textbox' !== type) {
    overlay.style.background = 'rgba(255, 255, 255, 0.7)';
  }
  overlay.style.cursor = 'move';
  overlay.querySelector('a').style.display = 'none';

  document.addEventListener('mousemove', handleDocumentMousemove);
  document.addEventListener('mouseup', handleDocumentMouseup);
  disableUserSelect();
}

/**
 * Handle document.mousemove event
 *
 * @param {Event} e The DOM event that needs to be handled
 */
function handleDocumentMousemove(e) {
  let parentNode = overlay.parentNode;
  let rect = parentNode.getBoundingClientRect();
  let y = (dragStartY + (e.clientY - dragOffsetY));
  let x = (dragStartX + (e.clientX - dragOffsetX));
  let minY = 0;
  let maxY = rect.height;
  let minX = 0;
  let maxX = rect.width;

  if (y > minY && y + overlay.offsetHeight < maxY) {
    overlay.style.top = `${y}px`;
  }

  if (x > minX && x + overlay.offsetWidth < maxX) {
    overlay.style.left = `${x}px`;
  }
}

/**
 * Handle document.mouseup event
 *
 * @param {Event} e The DOM event that needs to be handled
 */
function handleDocumentMouseup(e) {
  let annotationId = overlay.getAttribute('data-target-id');
  let target = document.querySelectorAll(`[data-pdf-annotate-id="${annotationId}"]`);
  let type = target[0].getAttribute('data-pdf-annotate-type');
  let svg = overlay.parentNode.querySelector(config.annotationSvgQuery());
  let { documentId } = getMetadata(svg);

  overlay.querySelector('a').style.display = '';

  // Move annotation
  PDFJSAnnotate.getStoreAdapter().getAnnotation(documentId, annotationId).then((annotation) => {
    let attribX = 'x';
    let attribY = 'y';
    if (['circle', 'fillcircle', 'emptycircle'].indexOf(type) > -1) {
      attribX = 'cx';
      attribY = 'cy';
    }

    if (type === 'point'|| type === 'sign' || type === 'signimg') {
      [...target].forEach((t, i) => {
        let moveTo = {
          x: overlay.offsetLeft,
          y: overlay.offsetTop
        };
        let scaled_pos = scaleDown(svg, moveTo);
        t.setAttribute(attribX, scaled_pos.x);
        t.setAttribute(attribY, scaled_pos.y);
        annotation[attribX] = scaled_pos.x;
        annotation[attribY] = scaled_pos.y;
      });
    }
    else if (['area', 'highlight', 'textbox', 'circle', 'fillcircle', 'emptycircle', 'sign', 'signimg'].indexOf(type) > -1) {
      let modelStart = convertToSvgPoint([dragStartX, dragStartY], svg);
      let modelEnd = convertToSvgPoint([overlay.offsetLeft, overlay.offsetTop], svg);
      let modelDelta = {
        x: modelEnd[0] - modelStart[0],
        y: modelEnd[1] - modelStart[1]
      };

      if (type === 'textbox') {
        // <text> and <tspan> both need to be targets.
        target = [target[0].firstChild, target[0].firstChild.firstChild];
      }

      [...target].forEach((t, i) => {
        let modelX = parseInt(t.getAttribute(attribX), 10);
        let modelY = parseInt(t.getAttribute(attribY), 10);
        if (modelDelta.y !== 0) {
          modelY = modelY + modelDelta.y;

          t.setAttribute(attribY, modelY);
          if (annotation.rectangles && i < annotation.rectangles.length) {
            annotation.rectangles[i].y = modelY;
          }
          else if (annotation[attribY]) {
            annotation[attribY] = modelY;
          }
        }
        if (modelDelta.x !== 0) {
          modelX = modelX + modelDelta.x;

          t.setAttribute(attribX, modelX);
          if (annotation.rectangles && i < annotation.rectangles.length) {
            annotation.rectangles[i].x = modelX;
          }
          else if (annotation[attribX]) {
            annotation[attribX] = modelX;
          }
        }
      });
    }
    else if (type === 'strikeout') {
      return;
    //   let { deltaX, deltaY } = getDelta('x1', 'y1');
    //   [...target].forEach(target, (t, i) => {
    //     if (deltaY !== 0) {
    //       t.setAttribute('y1', parseInt(t.getAttribute('y1'), 10) + deltaY);
    //       t.setAttribute('y2', parseInt(t.getAttribute('y2'), 10) + deltaY);
    //       annotation.rectangles[i].y = parseInt(t.getAttribute('y1'), 10);
    //     }
    //     if (deltaX !== 0) {
    //       t.setAttribute('x1', parseInt(t.getAttribute('x1'), 10) + deltaX);
    //       t.setAttribute('x2', parseInt(t.getAttribute('x2'), 10) + deltaX);
    //       annotation.rectangles[i].x = parseInt(t.getAttribute('x1'), 10);
    //     }
    //   });
    }
    else if (type === 'drawing' || type === 'arrow') {
      let modelStart = convertToSvgPoint([dragStartX, dragStartY], svg);
      let modelEnd = convertToSvgPoint([overlay.offsetLeft, overlay.offsetTop], svg);
      let modelDelta = {
        x: modelEnd[0] - modelStart[0],
        y: modelEnd[1] - modelStart[1]
      };

      // update annotation
      annotation.lines.forEach((line, i) => {
        let [x, y] = annotation.lines[i];
        annotation.lines[i][0] = parseFloat(x) + modelDelta.x;
        annotation.lines[i][1] = parseFloat(y) + modelDelta.y;
      });

      // replace old path with new one
      target[0].parentNode.removeChild(target[0]);
      appendChild(svg, annotation);
    }

    PDFJSAnnotate.getStoreAdapter().editAnnotation(documentId, annotationId, annotation);
  });

  setTimeout(() => {
    isDragging = false;
  }, 0);

  if ('textbox' !== type) {
    overlay.style.background = '';
  }
  overlay.style.cursor = '';

  document.removeEventListener('mousemove', handleDocumentMousemove);
  document.removeEventListener('mouseup', handleDocumentMouseup);
  enableUserSelect();
}

/**
 * Handle annotation.click event
 *
 * @param {Element} target The annotation element that was clicked
 */
function handleAnnotationClick(target) {
  createEditOverlay(target);
}

/**
 * Enable edit mode behavior.
 */
export function enableEdit() {
  if (_enabled) {
    return;
  }

  _enabled = true;
  addEventListener('annotation:click', handleAnnotationClick);
};

/**
 * Disable edit mode behavior.
 */
export function disableEdit() {
  destroyEditOverlay();

  if (!_enabled) {
    return;
  }

  _enabled = false;
  removeEventListener('annotation:click', handleAnnotationClick);
};

