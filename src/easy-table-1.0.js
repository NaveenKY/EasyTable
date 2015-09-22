/** 
* @author Naveen Kumar <imnaveenyadav@gmail.com> 
* version: 1.0.0 
* https://github.com/NaveenKY/EasyTable/
*/ 

;(function ( $, window, document, undefined ) {

	"use strict";
	var easyTable = "easyTable",
		defaults = {
			
	};

	// The actual Easy Table constructor
	function EasyTable ( element, options ) {
		this.element = element;
		this.settings = $.extend( {}, defaults, options );
		this._defaults = defaults;
		this._name = easyTable;
		this.menuOpen = false;
		this.init();
	}

	// Avoid EasyTable.prototype conflicts
	$.extend(EasyTable.prototype, {
		init: function () {
			this.prepareTable();
			var that = this;
			$(document).bind("click", function(event) {
				if(that.menuOpen && that.$contextMenu) {
					document.body.removeChild(that.$contextMenu);
					that.menuOpen = false;
					that.$contextMenu = null;
				}
			});
		},
		prepareTable: function () {
			if(this.settings.columns && this.settings.columns instanceof Array && this.settings.columns.length > 0) {
				this.element.innerHTML='';
				var tHead = document.createElement("tHead");
				var tr = document.createElement("tr");
				var that = this, draggedColumn;
				this.settings.columns.forEach(function(column){
					var th = document.createElement("th");
					$(th).on("dragstart", function(e) {
						var colIndex = e.currentTarget.cellIndex;
						draggedColumn = document.createElement("table");
						$(that.element).find('tr').each(function(index, row){
							var newRow = document.createElement("tr");
							newRow.appendChild($(row).children()[colIndex].cloneNode(true));
							draggedColumn.appendChild(newRow);
						});
						document.body.appendChild(draggedColumn);
						draggedColumn.style.top = $(that.element).offset().top + 'px';
						draggedColumn.style.left = $(that.element).offset().left + 'px';
						draggedColumn.style.zIndex="-100";
						draggedColumn.style.position="absolute";
						draggedColumn.className='easy-table';
						draggedColumn.id='easy-table-dragged';
						e.originalEvent.dataTransfer.effectAllowed="move";
						e.originalEvent.dataTransfer.setData('colIndex', e.currentTarget.cellIndex);
						e.originalEvent.dataTransfer.setDragImage(draggedColumn, 0, 0);
					});
					$(th).on("dragover", function(e) {
						e.preventDefault();
					});
					$(th).on("drop", function(e) {
						e.preventDefault();
						document.body.removeChild(draggedColumn);
						var dragColIndex = e.originalEvent.dataTransfer.getData('colIndex');
						var targetColIndex = e.currentTarget.cellIndex;
						var column = that.settings.columns[dragColIndex];
						that.settings.columns.splice(dragColIndex, 1);
						if(dragColIndex < targetColIndex) {
							that.settings.columns.splice(targetColIndex, 0, column);
						} else {
							that.settings.columns.splice(targetColIndex, 0, column);
						}
						that.prepareTable(that.settings.data);
					});
					th.textContent = column.header;
					th.draggable = true;
					tr.appendChild(th);
				});
				tHead.appendChild(tr);
				this.element.appendChild(tHead);
				this.element.className = 'easy-table';
				if(this.settings.data) {
					this.loadData(this.settings.data);
				}
				$($(this.element).find('tBody tr')).on("contextmenu", function(e) {
					if(that.menuOpen && that.$contextMenu) {
						document.body.removeChild(that.$contextMenu);
						that.menuOpen = false;
						that.$contextMenu = null;
					}
					that.contextMenuRow = e.currentTarget.rowIndex;
					e.preventDefault();
					that.prepareContextMenu(e);
				});
			} else {
				throw 'List of columns must be passed in an Array.';
			}			
		},
		loadData: function(data) {
			this.settings.data = data;
			var columns = this.settings.columns, that = this;
			var tBody = document.createElement("tBody");
			data.forEach(function(rowData){
				var tr = document.createElement("tr");
				columns.forEach(function(column){
					var td = document.createElement("td");
					td.textContent = rowData[column.key];
					tr.appendChild(td);
				});
				tBody.appendChild(tr);
				$(tr).on('click', function(e) {
					if(e.shiftKey && that.shiftKeyPressed){
						var startIndex = that.startRow > e.currentTarget.rowIndex?e.currentTarget.rowIndex:that.startRow;
						var endIndex = that.startRow < e.currentTarget.rowIndex?e.currentTarget.rowIndex:that.startRow;
						var rows = ($(e.currentTarget.parentElement).find('tr'));
						for(var index = startIndex; index <= endIndex; index++){
							$(rows[index-1]).addClass('selected');
						}
					} else {
						if(e.shiftKey){
							that.shiftKeyPressed = true;
							that.startRow = e.currentTarget.rowIndex;
						} else {
							that.shiftKeyPressed = false;
							that.startRow = null;
						}
						if($(this).hasClass('selected')){
							$(this).removeClass('selected');
						} else {
							$(this).addClass('selected');
						}
					}
				});
			});
			this.element.appendChild(tBody);
		},
		prepareContextMenu: function(e){
			var posx = e.clientX +window.pageXOffset +'px'; //Left Position of Mouse Pointer
			var posy = e.clientY + window.pageYOffset + 'px'; //Top Position of Mouse Pointer
			var contextMenu = document.createElement('div'),
				menuItem1 = document.createElement('div'),
				menuItem2 = document.createElement('div'),
				menuItem3 = document.createElement('div'),
				menuItem4 = document.createElement('div');
			var menuItems = {'selectRow':'Select Row', 'selectAll':'Select All', 'copy':'Copy', 'exportTable':'Export'};
			this.menuOpen = true;
			var that = this;
			that.selectRow = function(e){
				$($(that.element).find('tr')[that.contextMenuRow]).addClass('selected');
			};
			that.selectAll = function(e){
				$($(that.element).find('tBody tr')).addClass('selected');
			};
			that.copy = function(e){
				that.copyData(JSON.stringify(that.selectedRows()));
			};
			that.exportTable = function(e){
				that.exportToCSV(e);
			};
			Object.keys(menuItems).forEach(function(item){
				var menuItem = document.createElement('div');
				menuItem.textContent = menuItems[item];
				menuItem.id = item;
				menuItem.addEventListener(that[item]);
				contextMenu.appendChild(menuItem);
			});
			contextMenu.className = 'easy-table easy-table-contextmenu';
			contextMenu.style.position = 'absolute';
			contextMenu.style.left = posx;
			contextMenu.style.top = posy;
			document.body.appendChild(contextMenu);
			this.$contextMenu = contextMenu;
			Object.keys(menuItems).forEach(function(item){
				$('#'+item).on('click', that[item]);
			});
		},
		selectedRows: function(e){
			var selection = $(this.element).find('.selected'),
				selectedData = [], that=this;

			selection.toArray().forEach(function(row){
				selectedData.push(that.settings.data[row.rowIndex-1]);
			});
			return selectedData;
		},
		copyData: function(text){
			var copyElement = document.createElement('input');
			copyElement.setAttribute('type', 'text');
			copyElement.setAttribute('value', text);
			copyElement = document.body.appendChild(copyElement);
			copyElement.select();
			try {
				document.execCommand('copy');
			} catch (e) {
				copyElement.remove();
			} finally {
				if (typeof e == 'undefined') {
					copyElement.remove();
				}
			}
		},
		exportToCSV: function(e){
			var data = this.settings.data;
			if(data.length > 0){
				var keys = Object.keys(data[0]);
				var csvData = '';
				data.forEach(function(model){
					var rowData = '';
					keys.forEach(function(key, index){
						rowData+=model[key];
						if(index !== (keys.length-1)){
							rowData+=',';
						}
					});
					rowData+='\n';
					csvData+=rowData;
				});
				csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvData);
				var downloadLink = document.createElement('a');
				downloadLink.download='Excel.csv';
				downloadLink.href=csvData;
				document.body.appendChild(downloadLink);
				downloadLink.click();
				document.body.removeChild(downloadLink);
			}
		}
	});

	var allMethods = [
		'selectedRows'
	];
	// A really lightweight plugin wrapper around the constructor,
	// preventing against multiple instantiations
	$.fn.easyTable = function (option, _relatedTarget) {
		var value, that=this;
	        this.each(function () {
        	    var $this = $(this),
					data = $this.data("plugin_" + easyTable),
					options = $.extend({}, EasyTable.defaults, typeof option === 'object' && option);
        	    if (typeof option === 'string') {
					if ($.inArray(option, allMethods) < 0) {
						throw new Error("Unknown method: " + option);
                	}
	                value = data[option](_relatedTarget);
	            }
        	    if ( !$.data( this, "plugin_" + easyTable  ) ) { 
        	    	$.data( this, "plugin_" + easyTable , new EasyTable( this, options ) ); 
        	    }
        	});
	        return typeof value === 'undefined' ? this : value;
	};
	$.fn.easyTable.methods = allMethods;

})( jQuery, window, document );
