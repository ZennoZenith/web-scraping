let d = (open $'./temp.json')

mut index = 0
let len = ($d | length) 

while $index < $len {
  let name = ($d | select $index | get fileName).0
  let dir = ($d | select $index | get dir).0
  let uri = ($d | select $index | get uri).0

  mkdir dir

  wget --no-check-certificate -q $uri -O $'($dir)/($name)'
  print $'Done ($dir)/($name)'

  $index += 1
}
