using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Diagnostics;
using System.Threading.Tasks;

namespace KikiAI
{
    [ApiController]
    [Route("api/calendar")]
    public class CalendarController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public CalendarController(IWebHostEnvironment env)
        {
            _env = env;
        }

        private string GetCalendarPath()
        {
            // Development: ../KikiCalendar
            // Production: sibling to the binary directory
            var path = Path.Combine(AppContext.BaseDirectory, "..", "KikiCalendar");
            if (!Directory.Exists(path))
            {
                // Fallback for different deployment structures
                path = Path.Combine(AppContext.BaseDirectory, "KikiCalendar");
            }
            return Path.GetFullPath(path);
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            var path = GetCalendarPath();
            return Ok(new
            {
                path = path,
                exists = Directory.Exists(path),
                folders = Directory.Exists(path) ? Directory.GetDirectories(path).Select(Path.GetFileName) : null
            });
        }

        [HttpGet("debug")]
        public IActionResult Debug()
        {
            var root = GetCalendarPath();
            var baseDir = AppContext.BaseDirectory;
            return Ok(new {
                baseDir = baseDir,
                baseItems = Directory.Exists(baseDir) ? Directory.GetFileSystemEntries(baseDir).Select(Path.GetFileName) : null,
                calendarPath = root,
                exists = Directory.Exists(root),
                files = Directory.Exists(root) ? Directory.GetFiles(root).Select(Path.GetFileName) : null,
                envWebRoot = _env.WebRootPath
            });
        }

        [HttpGet("assets")]
        public IActionResult ListAssets()
        {
            var root = GetCalendarPath();
            if (!Directory.Exists(root)) return NotFound("Calendar directory not found");

            var assets = new {
                images = ListFiles(Path.Combine(root, "kalendar_obrazky"), "*.png"),
                backgrounds = ListFiles(Path.Combine(root, "backgrounds"), "*.jpg"),
                icons = ListFiles(Path.Combine(root, "icons"), "*.png"),
                pdfs = ListFiles(root, "*.pdf"),
                jsons = ListFiles(root, "*.json")
            };

            return Ok(assets);
        }

        private List<object> ListFiles(string path, string pattern)
        {
            if (!Directory.Exists(path)) return new List<object>();
            return Directory.GetFiles(path, pattern)
                .Select(f => {
                    var info = new FileInfo(f);
                    return new {
                        name = info.Name,
                        size = info.Length,
                        modified = info.LastWriteTime
                    };
                })
                .OrderByDescending(f => f.modified)
                .Cast<object>()
                .ToList();
        }

        [HttpPost("run-script")]
        public async Task<IActionResult> RunScript([FromBody] RunScriptRequest request)
        {
            var root = GetCalendarPath();
            var scriptPath = Path.Combine(root, request.Script);
            
            if (!System.IO.File.Exists(scriptPath))
                return BadRequest(new { error = $"Script not found at: {scriptPath}" });

            var startInfo = new ProcessStartInfo
            {
                FileName = "python",
                Arguments = $"{request.Script} {request.Arguments}",
                WorkingDirectory = root,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            try
            {
                using var process = Process.Start(startInfo);
                var output = await process.StandardOutput.ReadToEndAsync();
                var error = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                return Ok(new {
                    exitCode = process.ExitCode,
                    output = output,
                    error = error
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("files/{folder}/{filename}")]
        public IActionResult GetFile(string folder, string filename)
        {
            var root = GetCalendarPath();
            var allowedFolders = new[] { "kalendar_obrazky", "backgrounds", "icons" };
            
            if (!allowedFolders.Contains(folder)) 
                return Forbidden();

            var filePath = Path.Combine(root, folder, filename);
            if (!System.IO.File.Exists(filePath)) return NotFound();

            var extension = Path.GetExtension(filename).ToLower();
            var contentType = extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".pdf" => "application/pdf",
                ".json" => "application/json",
                _ => "application/octet-stream"
            };

            return PhysicalFile(filePath, contentType);
        }

        [HttpGet("preview/{filename}")]
        public IActionResult PreviewPdf(string filename)
        {
            var root = GetCalendarPath();
            var filePath = Path.Combine(root, filename);
            if (!System.IO.File.Exists(filePath) || !filename.EndsWith(".pdf")) return NotFound();

            // Explicitly set inline disposition to prevent forced download
            Response.Headers.Add("Content-Disposition", "inline");
            return PhysicalFile(filePath, "application/pdf");
        }

        [HttpGet("json/{filename}")]
        public IActionResult GetJson(string filename)
        {
            var root = GetCalendarPath();
            var filePath = Path.Combine(root, filename);
            if (!System.IO.File.Exists(filePath) || !filename.EndsWith(".json")) return NotFound();

            return PhysicalFile(filePath, "application/json");
        }

        private IActionResult Forbidden() => StatusCode(403, "Access to this folder is restricted.");

        public class RunScriptRequest
        {
            public string Script { get; set; }
            public string Arguments { get; set; }
        }
    }
}
