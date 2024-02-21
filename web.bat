copy .\node_modules\pdfjs-dist\build\pdf.js .\shared\
copy .\node_modules\pdfjs-dist\build\pdf.js.map .\shared
copy .\node_modules\pdfjs-dist\build\pdf.worker.js .\shared\
copy .\node_modules\pdfjs-dist\build\pdf.worker.js.map .\shared\
copy .\node_modules\pdfjs-dist\web\pdf_viewer.js .\shared\
copy .\node_modules\pdfjs-dist\web\pdf_viewer.js.map .\shared\
copy .\node_modules\pdfjs-dist\web\pdf_viewer.css .\shared\

xcopy /s /y .\node_modules\pdfjs-dist\cmaps\ .\shared\cmaps\

rmdir /s /q .\web\shared\
xcopy /s .\shared web\shared\

./node_modules/.bin/webpack-dev-server  --config ./webpack.web.js