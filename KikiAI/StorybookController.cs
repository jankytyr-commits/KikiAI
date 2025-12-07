using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace KikiAI
{
    [ApiController]
    [Route("api/storybook")]
    public class StorybookController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public StorybookController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpGet("list")]
        public IActionResult ListStories()
        {
            try
            {
                var bookcasePath = Path.Combine(_env.WebRootPath, "apps", "KiStorybook", "bookcase");
                
                if (!Directory.Exists(bookcasePath))
                {
                    return Ok(new List<object>()); // Return empty array if directory doesn't exist
                }

                var htmlFiles = Directory.GetFiles(bookcasePath, "*.html")
                    .Concat(Directory.GetFiles(bookcasePath, "*.htm"))
                    .Where(f => !Path.GetFileName(f).Equals("index.html", StringComparison.OrdinalIgnoreCase))
                    .Select(filePath =>
                    {
                        var fileName = Path.GetFileName(filePath);
                        var fileInfo = new FileInfo(filePath);
                        var title = Path.GetFileNameWithoutExtension(fileName)
                            .Replace("_", " ")
                            .Replace("-", " ");

                        return new
                        {
                            filename = "bookcase/" + fileName,
                            title = title,
                            date = fileInfo.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
                        };
                    })
                    .ToList();

                return Ok(htmlFiles);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
