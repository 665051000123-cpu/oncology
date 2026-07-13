
import sys

with open("client/index.html", "r", encoding="utf-8") as f:
    content = f.read()

handler = """
    <script>
        window.addEventListener("error", function (e) {
            var errorDiv = document.createElement("div");
            errorDiv.style.position = "fixed";
            errorDiv.style.top = "0";
            errorDiv.style.left = "0";
            errorDiv.style.width = "100%";
            errorDiv.style.height = "100%";
            errorDiv.style.backgroundColor = "rgba(255, 0, 0, 0.9)";
            errorDiv.style.color = "white";
            errorDiv.style.zIndex = "999999";
            errorDiv.style.padding = "20px";
            errorDiv.style.fontSize = "20px";
            errorDiv.style.whiteSpace = "pre-wrap";
            errorDiv.innerHTML = "<h1>Application Crash</h1>" + e.message + "<br><br>" + (e.error ? e.error.stack : "");
            document.body.appendChild(errorDiv);
        });
        window.addEventListener("unhandledrejection", function (e) {
            var errorDiv = document.createElement("div");
            errorDiv.style.position = "fixed";
            errorDiv.style.top = "0";
            errorDiv.style.left = "0";
            errorDiv.style.width = "100%";
            errorDiv.style.height = "100%";
            errorDiv.style.backgroundColor = "rgba(255, 0, 0, 0.9)";
            errorDiv.style.color = "white";
            errorDiv.style.zIndex = "999999";
            errorDiv.style.padding = "20px";
            errorDiv.style.fontSize = "20px";
            errorDiv.style.whiteSpace = "pre-wrap";
            errorDiv.innerHTML = "<h1>Unhandled Promise Rejection</h1>" + e.reason;
            document.body.appendChild(errorDiv);
        });
    </script>
"""

if "<div id=\"root\"></div>" in content and "window.addEventListener" not in content:
    content = content.replace("<div id=\"root\"></div>", handler + "<div id=\"root\"></div>")
    with open("client/index.html", "w", encoding="utf-8") as f:
        f.write(content)
    print("Injected error handler")

