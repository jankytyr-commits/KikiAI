<?php
header('Content-Type: application/json');
$files = array();
if ($handle = opendir('.')) {
    while (false !== ($entry = readdir($handle))) {
        if ($entry != "." && $entry != ".." && $entry != "scan.php" && $entry != "web.config") {
            // Include html or htm files
            if (pathinfo($entry, PATHINFO_EXTENSION) == 'html' || pathinfo($entry, PATHINFO_EXTENSION) == 'htm') {
                $files[] = array(
                    'filename' => 'bookcase/' . $entry,
                    'title' => str_replace(['_', '-'], ' ', pathinfo($entry, PATHINFO_FILENAME)),
                    'date' => date("Y-m-d H:i:s", filemtime($entry))
                );
            }
        }
    }
    closedir($handle);
}
echo json_encode($files);
?>
