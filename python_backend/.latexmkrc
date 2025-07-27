# Overleaf-compatible latexmk configuration
$pdf_mode = 1; # Use pdfLaTeX (more compatible with legacy documents)
$pdflatex = 'pdflatex -interaction=nonstopmode -halt-on-error -file-line-error -shell-escape %O %S';
$bibtex_use = 2;
$biber = 'biber --validate-datamodel %O %S';
$max_repeat = 5;
$pdf_update_method = 0;
$cleanup_mode = 1;
$out_dir = '.';

# Additional settings to match Overleaf behavior
$ENV{'max_print_line'} = '10000';
$ENV{'error_line'} = '254'; 
$ENV{'half_error_line'} = '238';

# Enable shell escape for packages that need it
$latex = 'latex -interaction=nonstopmode -halt-on-error -file-line-error -shell-escape %O %S';
$lualatex = 'lualatex -interaction=nonstopmode -halt-on-error -file-line-error -shell-escape %O %S';
$xelatex = 'xelatex -interaction=nonstopmode -halt-on-error -file-line-error -shell-escape %O %S';

# Set up proper cleaning
$clean_ext = 'auxlock figlist makefile pyg fls fdb_latexmk run.xml synctex.gz toc nav snm out vrb bbl blg bcf log nlg nlo nls ilg idx ind lol lot lof pytxcode auxlock figlist makefile';
